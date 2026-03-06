import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { ListSubCategoryQuery } from './dto/list-sub-category-query.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import {
  SubCategory,
  SubCategoryDocument,
} from './entities/sub-category.entity';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
  ) {}

  create(createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoryModel.create(createSubCategoryDto);
  }

  findAll(query?: ListSubCategoryQuery) {
    const match: Record<string, unknown> = {};

    if (query?.categoryId) {
      match.categoryId = query.categoryId;
    }
    if (query?.subCategoryId) {
      match.subCategoryId = query.subCategoryId;
    }

    return this.subCategoryModel
      .aggregate([
        Object.keys(match).length ? { $match: match } : { $match: {} },
        { $sort: { categoryId: 1, subCategoryId: 1 } },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: 'categoryId',
            as: 'category',
          },
        },
        {
          $addFields: {
            categoryName: {
              $ifNull: [{ $arrayElemAt: ['$category.categoryName', 0] }, null],
            },
          },
        },
        { $project: { category: 0 } },
      ])
      .exec();
  }

  findOne(id: string) {
    return this.subCategoryModel.findById(id).exec();
  }

  update(id: string, updateSubCategoryDto: UpdateSubCategoryDto) {
    return this.subCategoryModel
      .findByIdAndUpdate(id, updateSubCategoryDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.subCategoryModel.findByIdAndDelete(id).exec();
  }

  findBySubCategoryId(subCategoryId: string) {
    return this.subCategoryModel.findOne({ subCategoryId }).exec();
  }

  upsertBySubCategoryId(dto: CreateSubCategoryDto) {
    return this.subCategoryModel
      .findOneAndUpdate(
        { subCategoryId: dto.subCategoryId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();
  }
}
