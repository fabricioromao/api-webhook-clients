import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BankingReportsDocument = HydratedDocument<BankingReports>;

@Schema({ collection: 'banking_reports', timestamps: true })
export class BankingReports {
  @Prop()
  nr_conta: string;

  @Prop()
  termo_consentimento: string;

  @Prop()
  fopa: string;

  @Prop()
  tipo_conta: string;

  @Prop()
  primeira_ativacao_conta: string;

  @Prop()
  conta_ativa_30dd: string;

  @Prop()
  cartao: string;

  @Prop()
  pap_clean_cartao: string;

  @Prop()
  pap_lastreado_cartao: string;

  @Prop()
  c_clean_cartao: string;

  @Prop()
  c_lastreado_cartao: string;

  @Prop()
  primeira_ativacao_cartao: string;

  @Prop()
  cartao_ativa_30dd: string;

  @Prop()
  cheque_aprovado: string;

  @Prop()
  cheque_contratado: string;

  @Prop()
  cp_contratado: string;

  @Prop()
  prioridade_contato_cp: string;

  @Prop()
  cobranca: string;

  @Prop()
  saldo_banking: string;

  @Prop()
  prog_relacionamento: string;

  @Prop()
  seguro_vida: string;

  @Prop()
  seguro_conta_cartao: string;

  @Prop()
  seguro_prestamista: string;

  @Prop()
  assessor: string;

  @Prop()
  cd_cge_partner: string;

  @Prop()
  dt_aquisicao_cartao: string;

  @Prop()
  portabilidade: string;

  @Prop()
  chave_pix: string;
}

export const BankingReportsSchema =
  SchemaFactory.createForClass(BankingReports);

BankingReportsSchema.index({
  nr_conta: 1,
});
