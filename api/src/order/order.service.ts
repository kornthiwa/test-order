import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrderQuery } from './dto/list-order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderDocument } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  private buildEnrichedOrderPipeline(match: Record<string, unknown>) {
    const pipeline: PipelineStage[] = [
      {
        $match: match,
      } as PipelineStage.Match,

      {
        $unwind: '$requestList',
      } as PipelineStage.Unwind,

      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$requestList.categoryID' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$categoryId', '$$categoryId'],
                },
              },
            },
            {
              $project: {
                _id: 0,
                categoryName: 1,
              },
            },
          ],
          as: 'category',
        },
      } as PipelineStage.Lookup,

      {
        $lookup: {
          from: 'subcategories',
          let: {
            subCategoryId: '$requestList.subCategoryID',
            categoryId: '$requestList.categoryID',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$subCategoryId', '$$subCategoryId'] },
                    { $eq: ['$categoryId', '$$categoryId'] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                subCategoryName: 1,
              },
            },
          ],
          as: 'subCategory',
        },
      } as PipelineStage.Lookup,

      {
        $set: {
          'requestList.categoryName': {
            $ifNull: [{ $arrayElemAt: ['$category.categoryName', 0] }, null],
          },
          'requestList.subCategoryName': {
            $ifNull: [
              { $arrayElemAt: ['$subCategory.subCategoryName', 0] },
              null,
            ],
          },
        },
      } as PipelineStage.Set,

      {
        $unset: ['category', 'subCategory'],
      } as PipelineStage.Unset,

      {
        $group: {
          _id: '$_id',
          doc: { $first: '$$ROOT' },
          requestList: { $push: '$requestList' },
        },
      } as PipelineStage.Group,

      {
        $set: {
          'doc.requestList': '$requestList',
        },
      } as PipelineStage.Set,

      {
        $replaceRoot: {
          newRoot: '$doc',
        },
      } as PipelineStage.ReplaceRoot,
    ];

    return pipeline;
  }

  create(createOrderDto: CreateOrderDto) {
    return this.orderModel.create(createOrderDto);
  }

  findAll() {
    return this.orderModel.find().exec();
  }

  async findAllWithFilters(query: ListOrderQuery) {
    const {
      page = 1,
      pageSize = 10,
      dateFrom,
      dateTo,
      orderType,
      categoryId,
      subCategoryId,
      orderId,
      orderIdMatchMode = 'contains',
      priceMin,
      priceMax,
      grade = 'ALL',
    } = query;

    const topMatch: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      topMatch.orderFinishedDate = {};
      if (dateFrom)
        (topMatch.orderFinishedDate as Record<string, string>).$gte = dateFrom;
      if (dateTo)
        (topMatch.orderFinishedDate as Record<string, string>).$lte = dateTo;
    }

    if (orderType) {
      topMatch.orderType = orderType;
    }

    if (orderId) {
      if (orderIdMatchMode === 'exact') {
        topMatch.orderId = orderId;
      } else {
        topMatch.orderId = new RegExp(
          orderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i',
        );
      }
    }

    const hasCategoryFilter = Boolean(categoryId || subCategoryId);
    const hasItemFilter =
      grade !== 'ALL' || priceMin != null || priceMax != null;
    const needsNestedFiltering = hasCategoryFilter || hasItemFilter;

    const p = Math.max(1, page);
    const ps = Math.min(100, Math.max(1, pageSize));
    const skip = (p - 1) * ps;

    if (!needsNestedFiltering) {
      const [items, total] = await Promise.all([
        this.orderModel.find(topMatch).skip(skip).limit(ps).exec(),
        this.orderModel.countDocuments(topMatch).exec(),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / ps));
      const currentPage = Math.min(p, totalPages);

      return {
        items,
        total,
        page: p,
        pageSize: ps,
        totalPages,
        currentPage,
        startIndex: skip,
        totalMatchingItems: null,
      };
    }

    const base: PipelineStage[] = [];
    if (Object.keys(topMatch).length > 0)
      base.push({ $match: topMatch } as PipelineStage.Match);

    base.push({ $set: { __order: '$$ROOT' } } as PipelineStage.Set);
    base.push({ $unwind: '$requestList' } as PipelineStage.Unwind);
    if (categoryId)
      base.push({
        $match: { 'requestList.categoryID': categoryId },
      } as PipelineStage.Match);
    if (subCategoryId)
      base.push({
        $match: { 'requestList.subCategoryID': subCategoryId },
      } as PipelineStage.Match);

    const itemStages: PipelineStage[] = [];
    if (hasItemFilter) {
      itemStages.push({
        $unwind: '$requestList.requestList',
      } as PipelineStage.Unwind);

      if (grade !== 'ALL') {
        itemStages.push({
          $match: { 'requestList.requestList.grade': grade },
        } as PipelineStage.Match);
      }

      if (priceMin != null || priceMax != null) {
        const exprAnd: unknown[] = [];
        if (priceMin != null) {
          exprAnd.push({
            $gte: [{ $toDouble: '$requestList.requestList.price' }, priceMin],
          });
        }
        if (priceMax != null) {
          exprAnd.push({
            $lte: [{ $toDouble: '$requestList.requestList.price' }, priceMax],
          });
        }
        itemStages.push({
          $match: { $expr: { $and: exprAnd } },
        } as PipelineStage.Match);
      }

      itemStages.push({
        $match: {
          $or: [
            { 'requestList.requestList.total': { $gt: 0 } },
            { 'requestList.requestList.quantity': { $ne: '0' } },
          ],
        },
      } as PipelineStage.Match);
    }

    const groupToOrders: PipelineStage[] = [
      {
        $group: {
          _id: '$__order._id',
          doc: { $first: '$__order' },
        },
      } as PipelineStage.Group,
      { $replaceRoot: { newRoot: '$doc' } } as PipelineStage.ReplaceRoot,
    ];

    const sortStage: PipelineStage.Sort = {
      $sort: { orderFinishedDate: -1, orderFinishedTime: -1, orderId: -1 },
    };

    const facet: PipelineStage.Facet = {
      $facet: {
        items: [
          ...groupToOrders,
          sortStage,
          { $skip: skip } as PipelineStage.Skip,
          { $limit: ps } as PipelineStage.Limit,
        ] as PipelineStage.FacetPipelineStage[],
        total: [
          ...groupToOrders,
          { $count: 'count' } as PipelineStage.Count,
        ] as PipelineStage.FacetPipelineStage[],
        totalMatchingItems: (hasItemFilter
          ? [{ $count: 'count' } as PipelineStage.Count]
          : []) as PipelineStage.FacetPipelineStage[],
      },
    };

    const pipeline: PipelineStage[] = [...base, ...itemStages, facet];
    const agg = await this.orderModel.aggregate(pipeline).exec();
    const first = Array.isArray(agg) && agg.length > 0 ? agg[0] : null;

    const items: Order[] = Array.isArray(first?.items) ? first.items : [];
    const total =
      Array.isArray(first?.total) &&
      first.total.length > 0 &&
      typeof first.total[0]?.count === 'number'
        ? first.total[0].count
        : 0;

    const totalPages = Math.max(1, Math.ceil(total / ps));
    const currentPage = Math.min(p, totalPages);

    const totalMatchingItems =
      grade !== 'ALL' &&
      Array.isArray(first?.totalMatchingItems) &&
      first.totalMatchingItems.length > 0 &&
      typeof first.totalMatchingItems[0]?.count === 'number'
        ? first.totalMatchingItems[0].count
        : grade !== 'ALL'
          ? 0
          : null;

    return {
      items,
      total,
      page: p,
      pageSize: ps,
      totalPages,
      currentPage,
      startIndex: skip,
      totalMatchingItems,
    };
  }

  async summarize(query: ListOrderQuery) {
    const {
      dateFrom,
      dateTo,
      orderType,
      categoryId,
      subCategoryId,
      orderId,
      orderIdMatchMode = 'contains',
      priceMin,
      priceMax,
      grade = 'ALL',
    } = query;

    const topMatch: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      topMatch.orderFinishedDate = {};
      if (dateFrom)
        (topMatch.orderFinishedDate as Record<string, string>).$gte = dateFrom;
      if (dateTo)
        (topMatch.orderFinishedDate as Record<string, string>).$lte = dateTo;
    }

    if (orderType) {
      topMatch.orderType = orderType;
    }

    if (orderId) {
      if (orderIdMatchMode === 'exact') {
        topMatch.orderId = orderId;
      } else {
        topMatch.orderId = new RegExp(
          orderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i',
        );
      }
    }

    const pipeline: PipelineStage[] = [];

    if (Object.keys(topMatch).length > 0) {
      pipeline.push({ $match: topMatch } as PipelineStage.Match);
    }

    pipeline.push(
      { $unwind: '$requestList' } as PipelineStage.Unwind,
      ...(categoryId
        ? ([
            {
              $match: { 'requestList.categoryID': categoryId },
            } as PipelineStage.Match,
          ] as PipelineStage[])
        : []),
      ...(subCategoryId
        ? ([
            {
              $match: { 'requestList.subCategoryID': subCategoryId },
            } as PipelineStage.Match,
          ] as PipelineStage[])
        : []),
      { $unwind: '$requestList.requestList' } as PipelineStage.Unwind,
    );

    if (grade !== 'ALL') {
      pipeline.push({
        $match: { 'requestList.requestList.grade': grade },
      } as PipelineStage.Match);
    }

    if (priceMin != null || priceMax != null) {
      const exprAnd: unknown[] = [];
      if (priceMin != null) {
        exprAnd.push({
          $gte: [
            { $toDouble: '$requestList.requestList.price' },
            priceMin,
          ],
        });
      }
      if (priceMax != null) {
        exprAnd.push({
          $lte: [
            { $toDouble: '$requestList.requestList.price' },
            priceMax,
          ],
        });
      }
      if (exprAnd.length > 0) {
        pipeline.push({
          $match: { $expr: { $and: exprAnd } },
        } as PipelineStage.Match);
      }
    }

    pipeline.push(
      {
        $addFields: {
          __price: { $toDouble: '$requestList.requestList.price' },
          __quantityKg: {
            $cond: [
              {
                $in: [
                  {
                    $type: '$requestList.requestList.quantity',
                  },
                  ['string', 'double', 'int', 'long', 'decimal'],
                ],
              },
              { $toDouble: '$requestList.requestList.quantity' },
              0,
            ],
          },
        },
      } as PipelineStage.AddFields,
      {
        $addFields: {
          __amount: { $multiply: ['$__price', '$__quantityKg'] },
        },
      } as PipelineStage.AddFields,
      {
        $group: {
          _id: {
            categoryID: '$requestList.categoryID',
            subCategoryID: '$requestList.subCategoryID',
            orderType: '$orderType',
          },
          categoryID: { $first: '$requestList.categoryID' },
          subCategoryID: { $first: '$requestList.subCategoryID' },
          orderType: { $first: '$orderType' },
          quantityKg: { $sum: '$__quantityKg' },
          amount: { $sum: '$__amount' },
          minPrice: { $min: '$__price' },
          maxPrice: { $max: '$__price' },
          gradeAQtyKg: {
            $sum: {
              $cond: [
                { $eq: ['$requestList.requestList.grade', 'A'] },
                '$__quantityKg',
                0,
              ],
            },
          },
          gradeBQtyKg: {
            $sum: {
              $cond: [
                { $eq: ['$requestList.requestList.grade', 'B'] },
                '$__quantityKg',
                0,
              ],
            },
          },
          gradeCQtyKg: {
            $sum: {
              $cond: [
                { $eq: ['$requestList.requestList.grade', 'C'] },
                '$__quantityKg',
                0,
              ],
            },
          },
          gradeDQtyKg: {
            $sum: {
              $cond: [
                { $eq: ['$requestList.requestList.grade', 'D'] },
                '$__quantityKg',
                0,
              ],
            },
          },
          orderIds: { $addToSet: '$orderId' },
        },
      } as PipelineStage.Group,
      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$categoryID' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$categoryId', '$$categoryId'] },
              },
            },
            {
              $project: {
                _id: 0,
                categoryName: 1,
              },
            },
          ],
          as: 'category',
        },
      } as PipelineStage.Lookup,
      {
        $lookup: {
          from: 'subcategories',
          let: {
            subCategoryId: '$subCategoryID',
            categoryId: '$categoryID',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$subCategoryId', '$$subCategoryId'] },
                    { $eq: ['$categoryId', '$$categoryId'] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                subCategoryName: 1,
              },
            },
          ],
          as: 'subCategory',
        },
      } as PipelineStage.Lookup,
      {
        $set: {
          categoryName: {
            $ifNull: [{ $arrayElemAt: ['$category.categoryName', 0] }, null],
          },
          subCategoryName: {
            $ifNull: [
              { $arrayElemAt: ['$subCategory.subCategoryName', 0] },
              null,
            ],
          },
        },
      } as PipelineStage.Set,
      {
        $project: {
          category: 0,
          subCategory: 0,
        },
      } as PipelineStage.Project,
    );

    const agg = await this.orderModel.aggregate(pipeline).exec();

    type SideMetrics = {
      quantityKg: number;
      amount: number;
      minPrice: number | null;
      maxPrice: number | null;
      gradeAQtyKg: number;
      gradeBQtyKg: number;
      gradeCQtyKg: number;
      gradeDQtyKg: number;
      orderIds: string[];
    };

    type Row = {
      categoryId: string;
      categoryName: string | null;
      subCategoryId: string;
      subCategoryName: string | null;
      buy: SideMetrics;
      sell: SideMetrics;
      remainQuantityKg: number;
      remainAmount: number;
    };

    const emptySide = (): SideMetrics => ({
      quantityKg: 0,
      amount: 0,
      minPrice: null,
      maxPrice: null,
      gradeAQtyKg: 0,
      gradeBQtyKg: 0,
      gradeCQtyKg: 0,
      gradeDQtyKg: 0,
      orderIds: [],
    });

    const byKey = new Map<string, Row>();

    for (const doc of agg as any[]) {
      const key = `${doc.categoryID}::${doc.subCategoryID}`;
      let row = byKey.get(key);
      if (!row) {
        row = {
          categoryId: doc.categoryID,
          categoryName: doc.categoryName ?? null,
          subCategoryId: doc.subCategoryID,
          subCategoryName: doc.subCategoryName ?? null,
          buy: emptySide(),
          sell: emptySide(),
          remainQuantityKg: 0,
          remainAmount: 0,
        };
        byKey.set(key, row);
      }

      const target = doc.orderType === 'sell' ? row.sell : row.buy;

      target.quantityKg += doc.quantityKg ?? 0;
      target.amount += doc.amount ?? 0;
      target.minPrice =
        target.minPrice == null
          ? doc.minPrice ?? null
          : doc.minPrice == null
            ? target.minPrice
            : Math.min(target.minPrice, doc.minPrice);
      target.maxPrice =
        target.maxPrice == null
          ? doc.maxPrice ?? null
          : doc.maxPrice == null
            ? target.maxPrice
            : Math.max(target.maxPrice, doc.maxPrice);
      target.gradeAQtyKg += doc.gradeAQtyKg ?? 0;
      target.gradeBQtyKg += doc.gradeBQtyKg ?? 0;
      target.gradeCQtyKg += doc.gradeCQtyKg ?? 0;
      target.gradeDQtyKg += doc.gradeDQtyKg ?? 0;
      if (Array.isArray(doc.orderIds)) {
        const existing = new Set(target.orderIds);
        for (const oid of doc.orderIds) {
          if (typeof oid === 'string' && !existing.has(oid)) {
            existing.add(oid);
            target.orderIds.push(oid);
          }
        }
      }
    }

    const rows: Row[] = [];

    let totalBuyQty = 0;
    let totalSellQty = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;

    for (const row of byKey.values()) {
      row.remainQuantityKg = row.buy.quantityKg - row.sell.quantityKg;
      row.remainAmount = row.buy.amount - row.sell.amount;

      totalBuyQty += row.buy.quantityKg;
      totalSellQty += row.sell.quantityKg;
      totalBuyAmount += row.buy.amount;
      totalSellAmount += row.sell.amount;

      rows.push(row);
    }

    rows.sort((a, b) => {
      if (a.categoryId === b.categoryId) {
        return a.subCategoryId.localeCompare(b.subCategoryId);
      }
      return a.categoryId.localeCompare(b.categoryId);
    });

    return {
      rows,
      totals: {
        buyQuantityKg: totalBuyQty,
        sellQuantityKg: totalSellQty,
        remainQuantityKg: totalBuyQty - totalSellQty,
        buyAmount: totalBuyAmount,
        sellAmount: totalSellAmount,
        remainAmount: totalBuyAmount - totalSellAmount,
      },
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const pipeline = this.buildEnrichedOrderPipeline({
      _id: new Types.ObjectId(id),
    });
    const [doc] = await this.orderModel.aggregate(pipeline).exec();
    return doc ?? null;
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    return this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.orderModel.findByIdAndDelete(id).exec();
  }

  async findByOrderId(orderId: string) {
    const pipeline = this.buildEnrichedOrderPipeline({ orderId });
    const [doc] = await this.orderModel.aggregate(pipeline).exec();
    return doc ?? null;
  }

  upsertByOrderId(dto: CreateOrderDto) {
    return this.orderModel
      .findOneAndUpdate(
        { orderId: dto.orderId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();
  }
}
