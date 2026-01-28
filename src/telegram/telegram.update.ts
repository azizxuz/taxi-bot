import { OrderFlow } from './handlers/flow/order.flow';
import { Update, Ctx, Start, Action, On } from 'nestjs-telegraf';
import type { Context } from 'telegraf';
import { StartCommand } from './handlers/start.handler';
import { CancelAction } from './handlers/cancel.action';

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

    // time step
    if (text) {
      await this.orderFlow.onTime(ctx, text);
    }

    // phone step (text yoki contact)
    await this.orderFlow.onPhone(ctx, ctx.message);
  }

  @Action('cancel')
  async cancel(@Ctx() ctx: Context): Promise<void> {
    await this.cancelAction.handle(ctx);
  }
}
