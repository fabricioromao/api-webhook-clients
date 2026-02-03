import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'customer_engagement' })
export class CustomerEngagement extends Document {
  @Prop({ required: true, trim: true })
  cpf_cnpj: string;

  @Prop({ required: true, trim: true })
  nivel_engajamento: string;

  @Prop({ required: true, trim: true })
  explicacao_engajamento: string;

  @Prop({ required: true, default: Date.now })
  data_acao: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CustomerEngagementSchema = SchemaFactory.createForClass(
  CustomerEngagement,
);

CustomerEngagementSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

CustomerEngagementSchema.index({ cpf_cnpj: 1 }, { unique: true });
CustomerEngagementSchema.index({ data_acao: -1 });
