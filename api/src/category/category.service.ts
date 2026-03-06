import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.categoryModel.create(createCategoryDto);
  }

  findAll() {
    return this.categoryModel.find().exec();
  }

  findOne(id: string) {
    return this.categoryModel.findById(id).exec();
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();
  }

  remove(id: string) {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }

  findByCategoryId(categoryId: string) {
    return this.categoryModel.findOne({ categoryId }).exec();
  }

  upsertByCategoryId(dto: CreateCategoryDto) {
    return this.categoryModel
      .findOneAndUpdate(
        { categoryId: dto.categoryId },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();
  }
}
