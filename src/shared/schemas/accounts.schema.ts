import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountsDocument = HydratedDocument<Accounts>;

@Schema({ collection: 'accounts', timestamps: true })
export class Accounts {
  @Prop()
  registration_data_id: string;

  @Prop()
  nr_conta: string;

  @Prop()
  nome_completo: string;

  @Prop()
  email: string;

  @Prop()
  email_lower: string;

  @Prop()
  tipo_cliente: string;

  @Prop()
  dt_nascimento: string;

  @Prop()
  dt_nascimento_date: Date;

  @Prop()
  autem_segment: string;

  @Prop()
  profissao: string;

  @Prop()
  estado_civil: string;

  @Prop()
  celular: string;

  @Prop()
  telefone: string;

  @Prop()
  documento_cpf_cnpj: string;

  @Prop()
  documento_tipo: string;

  @Prop()
  documento: string;

  @Prop()
  genero: string;

  @Prop()
  documento_dt_emissao: Date;

  @Prop()
  endereco_cidade: string;

  @Prop()
  endereco_completo: string;

  @Prop()
  endereco_complemento: string;

  @Prop()
  endereco_estado: string;

  @Prop()
  endereco_cep: string;

  @Prop()
  nm_officer: string;

  @Prop()
  perfil_investidor: string;

  @Prop()
  termo_curva_rf: boolean;

  @Prop()
  faixa_cliente: string;

  @Prop()
  dt_abertura: Date;

  @Prop()
  dt_encerramento: Date;

  @Prop()
  dt_vinculo: Date;

  @Prop()
  dt_primeiro_investimento: Date;

  @Prop()
  dt_ultimo_investimento: Date;

  @Prop()
  qtd_aportes: number;

  @Prop()
  vl_aportes: number;

  @Prop()
  vl_retiradas: number;

  @Prop()
  qtd_ativos: number;

  @Prop()
  qtd_fundos: number;

  @Prop()
  qtd_renda_fixa: number;

  @Prop()
  qtd_renda_variavel: number;

  @Prop()
  qtd_previdencia: number;

  @Prop()
  qtd_derivativos: number;

  @Prop()
  qtd_valores_transito: number;

  @Prop()
  pl_total: number;

  @Prop()
  pl_conta_corrente: number;

  @Prop()
  pl_fundos: number;

  @Prop()
  pl_renda_fixa: number;

  @Prop()
  pl_renda_variavel: number;

  @Prop()
  pl_previdencia: number;

  @Prop()
  pl_derivativos: number;

  @Prop()
  pl_valores_transito: number;

  @Prop()
  vl_pl_declarado: number;

  @Prop()
  vl_rendimento_total: number;

  @Prop()
  vl_rendimento_anual: number;

  @Prop()
  suitability: string;

  @Prop()
  dt_vencimento_suitability: Date;

  @Prop()
  tipo_investidor: string;

  @Prop()
  status: string;

  @Prop()
  cge_partner: number;

  @Prop()
  nm_partner: string;

  @Prop()
  cge_officer: number;
}

export const AccountsSchema = SchemaFactory.createForClass(Accounts);
