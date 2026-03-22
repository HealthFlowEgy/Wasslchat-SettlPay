import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { AiModule } from '../ai/ai.module';
@Module({ imports: [AiModule], controllers: [ContactsController], providers: [ContactsService], exports: [ContactsService] })
export class ContactsModule {}
