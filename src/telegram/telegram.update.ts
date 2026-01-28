import { OrderFlow } from './handlers/flow/order.flow';
import { Update, Ctx, Start, Action, On, Command, Hears } from 'nestjs-telegraf';
import type { Context } from 'telegraf';
import { StartCommand } from './handlers/start.handler';
import { CancelAction } from './handlers/cancel.action';
import reklamaText from 'src/data/reklama.text';


@Update()
export class TelegramUpdate {
  constructor(
    private readonly startCommand: StartCommand,
    private readonly cancelAction: CancelAction,
    private readonly orderFlow: OrderFlow,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context): Promise<void> {
    await this.startCommand.handle(ctx);
  }

  @Action('order')
  async order(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await this.orderFlow.start(ctx);
  }

  // route/gender inline callbacks
  @On('callback_query')
  async onCallback(@Ctx() ctx: any): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    if (data.startsWith('route:') || data === 'order:cancel') {
      await ctx.answerCbQuery();
      await this.orderFlow.onRoute(ctx, data);
      return;
    }

    if (data.startsWith('gender:') || data === 'order:cancel') {
      await ctx.answerCbQuery();
      await this.orderFlow.onGender(ctx, data);
      return;
    }
  }

  // time/phone text/contact
  @On('message')
  async onMessage(@Ctx() ctx: any): Promise<void> {
    const text = ctx.message?.text;

    // ✅ /reklama'ni shu yerning o'zida ishlatamiz (100%)
    if (text?.match(/^\/reklama(@\w+)?$/)) {
      await this.reklama(ctx);
      return;
    }

    // ✅ boshqa commandlar flowga kirmasin
    if (text?.startsWith('/')) return;

    if (text) {
      await this.orderFlow.onTime(ctx, text);
    }

    await this.orderFlow.onPhone(ctx, ctx.message);
  }

  @Action('cancel')
  async cancel(@Ctx() ctx: Context): Promise<void> {
    await this.cancelAction.handle(ctx);
  }
  @Hears(/^\/reklama(@\w+)?$/)
  async reklama(@Ctx() ctx: Context): Promise<void> {
    const botLink =
      process.env.BOT_LINK || 'https://t.me/@beshariq_fargona_taxi_pixl_bot';
    const kanalLink =
      process.env.CHANNEL_LINK || 'https://t.me/taxi_yangiliklari';

    await ctx.reply(reklamaText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚕 Buyurtma berish', callback_data: 'order' }],
          [{ text: '🤖 Botga kirish', url: botLink }],
          [{ text: '📢 Kanal', url: kanalLink }],
        ],
      },
    });
  }
}
