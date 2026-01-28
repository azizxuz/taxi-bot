

import { Injectable } from '@nestjs/common';
import startText from 'src/data/start.text';
import { StartService } from 'src/services/start/start.service';
import { Context } from 'telegraf';

@Injectable()
export class StartCommand {
    constructor(private userRepo:StartService){}
  async handle(ctx: Context) {
    const from = ctx.from;

    if (from) {
      const telegramUserId = from.id;
      const username = from.username ?? null;

      const fullName = [from.first_name, from.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const userId = String(telegramUserId);
      // ✅ repodagi tayyor method
      await this.userRepo.createUser({
        userId,
        userName: username,
        fullName: fullName,
      });
    }
    
    await ctx.reply(startText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🧾 Buyurtma berishni boshlash', callback_data: 'order' }],
          [{ text: '👤 Admin bilan bog\'lanish', url:'https://t.me/azez_coder' }],
        ],
      },
    });
  }
}

