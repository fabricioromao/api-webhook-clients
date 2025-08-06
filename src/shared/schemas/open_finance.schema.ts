import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OpenFinanceDocument = HydratedDocument<OpenFinance>;

@Schema({ collection: 'open_finance' })
export class OpenFinance {
  @Prop()
  nr_conta: string;

  @Prop()
  instituicao: string;

  @Prop()
  mercado: string;

  @Prop()
  dt_referencia: string;

  @Prop({ type: Number })
  vl_pl: number;

  @Prop()
  produto: string;

  @Prop()
  dt_vencimento: string;

  @Prop()
  taxa: string;

  @Prop()
  tipo_taxa: string;

  @Prop()
  indexador: string;

  @Prop()
  emissor: string;
}

export const OpenFinanceSchema = SchemaFactory.createForClass(OpenFinance);
