import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ _id: true })
export class Category {
  @Prop({ required: true, unique: true })
  categoryId: string;

  @Prop({ required: true })
  categoryName: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
