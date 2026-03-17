import { WhatsappWebhookController } from '../../src/modules/whatsapp/whatsapp-webhook.controller';

describe('WhatsappWebhookController', () => {
  let controller: WhatsappWebhookController;
  let prisma: any;
  let contacts: any;
  let conversations: any;
  let events: any;

  beforeEach(() => {
    prisma = {
      message: { create: jest.fn().mockResolvedValue({ id: 'm1', content: 'Hello' }) },
      conversation: { update: jest.fn().mockResolvedValue({}) },
      contact: { update: jest.fn().mockResolvedValue({}) },
      whatsappSession: { updateMany: jest.fn().mockResolvedValue({}) },
    };
    contacts = {
      findOrCreateByPhone: jest.fn().mockResolvedValue({ id: 'c1', phone: '01012345678', createdAt: new Date(Date.now() - 60000) }),
    };
    conversations = {
      findOrCreateForContact: jest.fn().mockResolvedValue({ id: 'conv1', createdAt: new Date(Date.now() - 60000) }),
    };
    events = {
      onContactCreated: jest.fn(),
      onNewConversation: jest.fn(),
      onNewInboundMessage: jest.fn(),
    };
    controller = new WhatsappWebhookController(prisma, contacts, conversations, events);
  });

  describe('handleWebhook — messages.upsert', () => {
    const msgPayload = {
      event: 'messages.upsert',
      data: {
        message: [{
          key: { remoteJid: '201012345678@s.whatsapp.net', fromMe: false, id: 'wa-msg-1' },
          pushName: 'Ahmed',
          message: { conversation: 'مرحبا' },
        }],
      },
    };

    it('should process inbound message end-to-end', async () => {
      const result = await controller.handleWebhook('t1', msgPayload);
      expect(result).toEqual({ received: true });
      expect(contacts.findOrCreateByPhone).toHaveBeenCalledWith('t1', '201012345678', expect.any(Object));
      expect(conversations.findOrCreateForContact).toHaveBeenCalledWith('t1', 'c1');
      expect(prisma.message.create).toHaveBeenCalled();
      expect(events.onNewInboundMessage).toHaveBeenCalledWith('t1', 'conv1', 'c1', expect.any(Object), 'مرحبا');
    });

    it('should ignore messages from self (fromMe=true)', async () => {
      const selfMsg = {
        event: 'messages.upsert',
        data: { message: [{ key: { remoteJid: '0101@s.whatsapp.net', fromMe: true }, message: { conversation: 'test' } }] },
      };
      await controller.handleWebhook('t1', selfMsg);
      expect(contacts.findOrCreateByPhone).not.toHaveBeenCalled();
    });

    it('should handle image messages', async () => {
      const imgPayload = {
        event: 'messages.upsert',
        data: {
          message: [{
            key: { remoteJid: '0101@s.whatsapp.net', fromMe: false, id: 'wa-img' },
            pushName: 'Sara',
            message: { imageMessage: { url: 'https://img.wa.net/photo.jpg', caption: 'Look at this' } },
          }],
        },
      };
      await controller.handleWebhook('t1', imgPayload);
      const createCall = prisma.message.create.mock.calls[0][0];
      expect(createCall.data.type).toBe('IMAGE');
      expect(createCall.data.mediaUrl).toBe('https://img.wa.net/photo.jpg');
    });
  });

  describe('handleWebhook — connection.update', () => {
    it('should update session status', async () => {
      await controller.handleWebhook('t1', { event: 'connection.update', data: { state: 'open' } });
      expect(prisma.whatsappSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'open' }),
      }));
    });
  });
});
