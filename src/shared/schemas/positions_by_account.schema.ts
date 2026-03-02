import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PositionsByAccountDocument = HydratedDocument<PositionsByAccount>;

@Schema({ collection: 'positions_by_account', timestamps: true })
export class PositionsByAccount {
  @Prop()
  account_number: string;

  @Prop({ type: Date })
  position_date: Date;

  @Prop({ type: String })
  contract_version: string;

  @Prop({ type: String })
  agency: string;

  @Prop({ type: Number })
  total_ammount: number;

  @Prop()
  summary_accounts: {
    market_name: string;
    market_abbreviation: string;
    position_date: Date;
    end_position_value: number;
    start_position_value: number;
  }[];

  @Prop([
    {
      share_value: { type: Number },
      fund: {
        fund_name: { type: String },
        security_code: { type: String },
        fund_c_g_e_code: { type: String },
        fund_c_n_p_j_code: { type: String },
        date_portfolio: { type: Date },
        manager_name: { type: String },
        manager_c_g_e_code: { type: String },
        fund_liquidity: { type: String },
        bench_mark: { type: String },
        es_tipo_portfolio: { type: String },
        tipo_cvm: { type: String },
        entity_type: { type: String },
        related_security_code_class: { type: String },
        related_security_code_fund: { type: String },
        related_class_c_g_e_code: { type: String },
        related_fund_c_g_e_code: { type: String },
      },
      acquisition: [
        {
          cost_price: { type: Number },
          income_tax: { type: Number },
          virtual_i_o_f: { type: Number },
          net_asset_value: { type: Number },
          gross_asset_value: { type: Number },
          acquisition_date: { type: Date },
          number_of_shares: { type: Number },
          acquisition_number: { type: Number },
          origem_amortizacao: { type: String },
          cost_value: { type: Number },
          cota_cetipada: { type: Boolean },
        },
      ],
      cota_cetipada_fundo_externo: { type: Boolean },
      position_date: { type: Date },
      processing_date_time: { type: Date },
    },
  ])
  investment_fund: {
    share_value: string;
    fund: {
      fund_name: string;
      security_code: string;
      fund_c_g_e_code: string;
      fund_c_n_p_j_code: string;
      date_portfolio: Date;
      manager_name: string;
      manager_c_g_e_code: string;
      fund_liquidity: string;
      bench_mark: string;
      es_tipo_portfolio: string;
      tipo_cvm: string;
      entity_type: string;
      related_security_code_class: string;
      related_security_code_fund: string;
      related_class_c_g_e_code: string;
      related_fund_c_g_e_code: string;
    };
    acquisition: {
      cost_price: string;
      income_tax: string;
      virtual_i_o_f: string;
      net_asset_value: string;
      gross_asset_value: string;
      acquisition_date: Date;
      number_of_shares: string;
      acquisition_number: string;
      origem_amortizacao: string;
      cost_value: string;
      cota_cetipada: string;
    }[];
    cota_cetipada_fundo_externo: string;
    position_date: Date;
    processing_date_time: Date;
  }[];

  @Prop([
    {
      accounting_group_code: { type: String },
      issuer: { type: String },
      issue_date: { type: Date },
      security_code: { type: String },
      issuer_c_g_e_code: { type: String },
      price_type: { type: String },
      value_type: { type: String },
      yield: { type: Number },
      ticker: { type: String },
      reference_index_name: { type: String },
      reference_index_value: { type: String },
      index_yield_rate: { type: String },
      maturity_date: { type: Date },
      quantity: { type: Number },
      price: { type: Number },
      gross_value: { type: Number },
      income_tax: { type: Number },
      i_o_f_tax: { type: Number },
      net_value: { type: Number },
      is_liquidity: { type: Boolean },
      acquisitions: [
        {
          acquisition_quantity: { type: Number },
          security_code: { type: Number },
          yield_to_maturity: { type: Number },
          acquisition_date: { type: Date },
          cost_price: { type: Number },
          initial_investment_value: { type: Number },
          initial_investment_quantity: { type: Number },
          net_value: { type: Number },
          gross_value: { type: Number },
          income_tax: { type: Number },
          i_o_f_tax: { type: Number },
          yield: { type: Number },
          complement_yield: { type: Number },
          index_yield_rate: { type: String },
          transfer_id: { type: String },
          f_t_s_id: { type: String },
          interface_date: { type: Date },
          price_income_tax: { type: Number },
          price_virtual_i_o_f: { type: Number },
          date_time_update: { type: Date },
          price_type: { type: String },
          price: { type: Number },
          is_virtual: { type: Boolean },
        },
      ],
    },
  ])
  fixed_income: any[];

  @Prop()
  pension_informations: any[];

  @Prop()
  investment_fund_cota_cetipada: any[];

  @Prop()
  credits: any[];

  @Prop()
  commodity: any[];

  @Prop()
  derivative: {
    ndf_position: any;
    bmf_future_position: any;
    bmf_option_position: any;
    cetip_option_position: any;
    swap_position: any;
  }[];

  @Prop()
  fixed_income_structured_note: any[];

  @Prop()
  payable_receivables: any[];

  @Prop()
  pending_settlements: {
    fixed_income: any;
    investment_fund: any;
    equities: any;
    derivative: any;
    pension: any;
    others: any;
  }[];

  @Prop()
  cash: {
    cash_collateral: any[];
    current_account: {
      value: number;
      position_date: Date;
    };
    cash_invested: any[];
  }[];

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  precatories: any;

  @Prop({ type: Date })
  event_create_date: Date;

  @Prop()
  equities: any[];

  @Prop()
  crypto_coin: any[];
}

export const PositionsByAccountSchema =
  SchemaFactory.createForClass(PositionsByAccount);

PositionsByAccountSchema.index({ account_number: 1, createdAt: -1 });
PositionsByAccountSchema.index({ account_number: 1, reference_date: -1 });
