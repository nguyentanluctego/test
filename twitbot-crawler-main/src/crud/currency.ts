import { DataSource, Repository, In } from "typeorm";
import { db } from "../config/dbconnection";
import { Currency } from "../models/currency";
import { randomUUID } from "node:crypto";

export class CurrencyRepositoryBase {
  private currencyRepository: Repository<Currency>;
  constructor(private readonly connection: DataSource) {
    this.currencyRepository = this.connection.getRepository(Currency);
  }

  async getCurrencyByKeywords(keywords: string[]) {
    return Promise.all(
      [...new Set(keywords.map((keyword) => keyword.toUpperCase()))].map(async (keyword) => {
        let currency = await this.currencyRepository.findOneBy({ name: keyword });
        if (!currency) currency = this.currencyRepository.create({ name: keyword, id: randomUUID() });
        currency.count_tweets = (currency?.count_tweets | 0) + 1;
        await this.currencyRepository.save(currency);
        return currency;
      })
    );
  }

  public get repository(): Repository<Currency> {
    return this.currencyRepository;
  }
}

export const CurrencyRepository = new CurrencyRepositoryBase(db);
