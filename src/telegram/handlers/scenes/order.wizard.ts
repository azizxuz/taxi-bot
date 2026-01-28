import { Injectable } from '@nestjs/common';
import { Scenes, Markup } from 'telegraf';
import type { Context } from 'telegraf';

type OrderData = {
  route?: string;
  time?: string;
  gender?: 'Ayol' | 'Erkak';
  phone?: string;
  fullName?: string;
  username?: string | null;
  userId?: string;
};

type WizardCtx = Context &
  Scenes.WizardContext & { wizard: Scenes.WizardContextWizard<WizardCtx> } & {
    session: { order?: OrderData };
  };

@Injectable()
export class OrderWizard {
  // Kanal ID: -100xxxxxxxxxx (bot kanal admin bo'lishi shart)
  private readonly ORDER_CHANNEL_ID = process.env.ORDER_CHANNEL_ID!;

  get scene() {
    return new Scenes.WizardScene<WizardCtx>(
      'ORDER_WIZARD',

      // STEP 0: Yo'nalish
      async (ctx) => {
        ctx.session.order = {};

        // start xabarini "edit" qilmoqchi bo'lsang:
        // try { await (ctx as any).editMessageText?.('...'); } catch {}

        await ctx.reply(`Iltimos yo'nalishni tanlang:`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "BESHARIQ → FARG'ONA",
                  callback_data: 'route:beshariq-fargona',
                },
              ],
              [
                {
                  text: "FARG'ONA → BESHARIQ",
                  callback_data: 'route:fargona-beshariq',
                },
              ],
              [{ text: '❌ Bekor qilish', callback_data: 'route:cancel' }],
            ],
          },
        });

        return ctx.wizard.next();
      },

      // STEP 1: route callback
      async (ctx) => {
        if (!('callbackQuery' in ctx.update) || !ctx.callbackQuery) {
          await ctx.reply("Yo'nalishni tugma orqali tanlang 🙂");
          return;
        }

        const data = (ctx.callbackQuery as any).data as string;

        if (data === 'route:cancel') {
          await ctx.answerCbQuery();
          await ctx.reply('Bekor qilindi.');
          return ctx.scene.leave();
        }

        if (!data.startsWith('route:')) return;

        const route = data.replace('route:', '');
        ctx.session.order!.route =
          route === 'beshariq-fargona'
            ? "BESHARIQ → FARG'ONA"
            : "FARG'ONA → BESHARIQ";

        await ctx.answerCbQuery();

        // Eski inline keyboardni "o'chirib qo'yish" (ixtiyoriy)
        try {
          await (ctx as any).editMessageReplyMarkup({ inline_keyboard: [] });
        } catch {}

        await ctx.reply('Soat nechida ketasiz? (masalan: 14:30 yoki 8:00)', {
          reply_markup: {
            keyboard: [[{ text: '⏰ Hozir' }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });

        return ctx.wizard.next();
      },

      // STEP 2: time (text)
      async (ctx) => {
        const text = (ctx.message as any)?.text;
        if (!text) {
          await ctx.reply('Soatni yozib yuboring (masalan: 14:30).');
          return;
        }

        ctx.session.order!.time = text === '⏰ Hozir' ? 'Hozir' : text;

        await ctx.reply('Jinsni tanlang:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👩 Ayol', callback_data: 'gender:Ayol' }],
              [{ text: '👨 Erkak', callback_data: 'gender:Erkak' }],
              [{ text: '❌ Bekor qilish', callback_data: 'gender:cancel' }],
            ],
          },
        });

        return ctx.wizard.next();
      },

      // STEP 3: gender callback
      async (ctx) => {
        if (!('callbackQuery' in ctx.update) || !ctx.callbackQuery) {
          await ctx.reply('Jinsni tugma orqali tanlang 🙂');
          return;
        }

        const data = (ctx.callbackQuery as any).data as string;

        if (data === 'gender:cancel') {
          await ctx.answerCbQuery();
          await ctx.reply('Bekor qilindi.');
          return ctx.scene.leave();
        }

        if (!data.startsWith('gender:')) return;

        ctx.session.order!.gender = data.replace('gender:', '') as
          | 'Ayol'
          | 'Erkak';
        await ctx.answerCbQuery();

        // Telefon so'rash (Contact tugma)
        await ctx.reply(
          'Telefon raqamingizni yuboring (tugmani bosing) yoki raqamni yozing:',
          Markup.keyboard([
            [Markup.button.contactRequest('📞 Telefon raqamni yuborish')],
          ])
            .resize()
            .oneTime(),
        );


        return ctx.wizard.next();
      },

      // STEP 4: contact yoki text phone
      async (ctx) => {
        const msg: any = ctx.message;

        let phone: string | undefined;

        if (msg?.contact?.phone_number) {
          phone = msg.contact.phone_number;
        } else if (msg?.text) {
          phone = msg.text;
        }

        if (!phone) {
          await ctx.reply('Telefon raqamni yuboring yoki yozing.');
          return;
        }

        // minimal normalize (xohlasang kuchaytiramiz)
        ctx.session.order!.phone = phone;

        // user info
        const from = (ctx as any).from;
        if (from) {
          ctx.session.order!.userId = String(from.id);
          ctx.session.order!.username = from.username ?? null;
          ctx.session.order!.fullName = [from.first_name, from.last_name]
            .filter(Boolean)
            .join(' ')
            .trim();
        }

        // Kanalga yuborish
        const o = ctx.session.order!;
        const textToChannel =
          `🚕 Yangi buyurtma!\n\n` +
          `📍 Yo'nalish: ${o.route}\n` +
          `⏰ Vaqt: ${o.time}\n` +
          `👤 Jins: ${o.gender}\n` +
          `📞 Telefon: ${o.phone}\n\n` +
          `🧾 Mijoz: ${o.fullName ?? '-'}\n` +
          `🔗 Username: ${o.username ? '@' + o.username : '-'}\n` +
          `🆔 ID: ${o.userId ?? '-'}`;

        // Reply keyboardni olib tashlaymiz
        await ctx.reply(
          "✅ Buyurtmangiz qabul qilindi! Tez orada bog'lanamiz.",
          {
            reply_markup: { remove_keyboard: true },
          },
        );

        // Kanalga yuborish
        await ctx.telegram.sendMessage(this.ORDER_CHANNEL_ID, textToChannel);

        return ctx.scene.leave();
      },
    );
  }
}
