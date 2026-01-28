import { Module } from '@nestjs/common';
import { StartModule } from 'src/services/start/start.module';
import { OrderModule } from 'src/services/orders/order.module';

import { TelegramUpdate } from './telegram.update';
import { StartCommand } from './handlers/start.handler';
import { CancelAction } from './handlers/cancel.action';
import { OrderFlow } from './handlers/flow/order.flow';

@Module({
  imports: [StartModule, OrderModule],
  providers: [TelegramUpdate, StartCommand, CancelAction, OrderFlow],
})
export class TelegramModule {}
