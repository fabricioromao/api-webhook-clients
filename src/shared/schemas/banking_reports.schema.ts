import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BankingReportsDocument = HydratedDocument<BankingReports>;

@Schema({ collection: 'banking_reports', timestamps: true })
export class BankingReports {
  @Prop()
  nr_conta?: string;

  @Prop()
  nome_representante?: string;

  @Prop()
  termo_consentimento?: string;

  @Prop()
  fopa?: string;

  @Prop()
  tipo_conta?: string;

  @Prop()
  primeira_ativacao_conta?: string;

  @Prop()
  conta_ativa_30dd?: string;

  @Prop()
  cartao?: string;

  @Prop()
  pap_clean_cartao?: string;

  @Prop()
  pap_lastreado_cartao?: string;

  @Prop()
  c_clean_cartao?: string;

  @Prop()
  c_lastreado_cartao?: string;

  @Prop()
  primeira_ativacao_cartao?: string;

  @Prop()
  cartao_ativa_30dd?: string;

  @Prop()
  cheque_aprovado?: string;

  @Prop()
  cheque_contratado?: string;

  @Prop()
  cp_contratado?: string;

  @Prop()
  prioridade_contato_cp?: string;

  @Prop()
  cobranca?: string;

  @Prop()
  saldo_banking?: string;

  @Prop()
  plano_conta?: string;

  @Prop()
  prog_relacionamento?: string;

  @Prop()
  iof_especial?: string;

  @Prop()
  sala_vip?: string;

  @Prop()
  seguro_vida?: string;

  @Prop()
  seguro_conta_cartao?: string;

  @Prop()
  seguro_prestamista?: string;

  @Prop()
  assessor?: string;

  @Prop()
  cd_cge_partner?: string;

  @Prop()
  dt_abertura_conta?: string;

  @Prop()
  dt_aquisicao_cartao?: string;

  @Prop()
  termo_cons_simplificado?: string;

  @Prop()
  cons_produto_serviço?: string;

  @Prop()
  vl_auc_total?: string;

  @Prop()
  venda_via_portal?: string;

  @Prop()
  carr_abandonado_cartao?: string;

  @Prop()
  cliente_heavy_user?: string;

  @Prop()
  cp_carr_abandonado?: string;

  @Prop()
  deb_automático?: string;

  @Prop()
  portabilidade?: string;

  @Prop()
  chave_pix?: string;
}

export const BankingReportsSchema =
  SchemaFactory.createForClass(BankingReports);
