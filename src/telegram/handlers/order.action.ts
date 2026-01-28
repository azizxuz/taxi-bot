import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class OrderAction {
  async handle(ctx: Context) {
    await ctx.reply(`Iltimos yo'nalishni tanglang`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'BESHARIQ-FARG\'ONA', callback_data: 'order' }],
          [
            {
              text: "FARG'ONA-BESHARIQ",
              callback_data:'order'
            },
          ],
        ],
      },
    });
  }
}
