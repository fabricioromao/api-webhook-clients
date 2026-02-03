import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'credit_card_spending_history', timestamps: true })
export class CreditCardSpendingHistory {
  @Prop({ required: true })
  reference_month: string;

  @Prop({ required: true })
  nr_conta: string;

  @Prop()
  nome_completo: string;

  @Prop({ required: true })
  gasto_cartao_centavos: number;

  @Prop()
  gasto_cartao_formatado: string;
}

export const CreditCardSpendingHistorySchema = SchemaFactory.createForClass(
  CreditCardSpendingHistory,
);

CreditCardSpendingHistorySchema.index(
  { nr_conta: 1, reference_month: 1 },
  { unique: true },
);
CreditCardSpendingHistorySchema.index({ nr_conta: 1 });
CreditCardSpendingHistorySchema.index({ reference_month: 1 });
