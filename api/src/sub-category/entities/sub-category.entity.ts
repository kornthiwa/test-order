import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubCategoryDocument = SubCategory & Document;

@Schema({ _id: true })
export class SubCategory {
  @Prop({ required: true, unique: true })
  subCategoryId: string;

  @Prop({ required: true })
  subCategoryName: string;

  @Prop({ required: true })
  categoryId: string;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
