import { EventBusService } from '../../src/common/events/event-bus.service';

describe('EventBusService', () => {
  let service: EventBusService;
  const mockWs = { emitNewOrder: jest.fn(), emitNewMessage: jest.fn(), emitConversationUpdate: jest.fn(), emitPaymentUpdate: jest.fn(), emitNotification: jest.fn() };
  const mockAutomation = { executeRules: jest.fn() };
  const mockNotifications = { notify: jest.fn() };
  const mockAuditLog = { log: jest.fn() };
  const mockChatbots = { matchTrigger: jest.fn() };
  const mockWebhooks = { dispatch: jest.fn() };

  beforeEach(() => {
    service = new EventBusService(
      mockWs as any, mockAutomation as any, mockNotifications as any,
      mockAuditLog as any, mockChatbots as any, mockWebhooks as any,
    );
    jest.clearAllMocks();
  });

  describe('onOrderCreated', () => {
    it('should fire all downstream effects', async () => {
      await service.onOrderCreated('t1', { id: 'o1', orderNumber: 'WC-1', total: 500, contactId: 'c1' }, 'u1');
      expect(mockWs.emitNewOrder).toHaveBeenCalledTimes(1);
      expect(mockNotifications.notify).toHaveBeenCalledTimes(1);
      expect(mockAuditLog.log).toHaveBeenCalledTimes(1);
      expect(mockAutomation.executeRules).toHaveBeenCalledTimes(1);
      expect(mockWebhooks.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should NOT throw if a downstream handler fails', async () => {
      mockNotifications.notify.mockRejectedValue(new Error('DB down'));
      mockWebhooks.dispatch.mockRejectedValue(new Error('Timeout'));
      // Should not throw — safe() catches errors
      await expect(
        service.onOrderCreated('t1', { id: 'o1', orderNumber: 'WC-1', total: 100, contactId: 'c1' })
      ).resolves.not.toThrow();
      // WS should still have fired
      expect(mockWs.emitNewOrder).toHaveBeenCalled();
    });
  });

  describe('onNewInboundMessage', () => {
    it('should trigger chatbot matching', async () => {
      mockChatbots.matchTrigger.mockResolvedValue({ id: 'bot1', name: 'Welcome' });
      await service.onNewInboundMessage('t1', 'conv1', 'c1', { id: 'm1' }, 'مرحبا');
      expect(mockChatbots.matchTrigger).toHaveBeenCalledWith('t1', 'مرحبا');
    });
  });

  describe('onPaymentCompleted', () => {
    it('should push WebSocket and notify', async () => {
      await service.onPaymentCompleted('t1', { id: 'p1', amount: 1000, currency: 'EGP' });
      expect(mockWs.emitPaymentUpdate).toHaveBeenCalled();
      expect(mockWs.emitNotification).toHaveBeenCalled();
      expect(mockNotifications.notify).toHaveBeenCalled();
    });
  });
});
