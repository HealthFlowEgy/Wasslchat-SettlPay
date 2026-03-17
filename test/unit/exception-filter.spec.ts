import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockMonitoring: any;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    mockMonitoring = { captureException: jest.fn() };
    filter = new AllExceptionsFilter(mockMonitoring);
    mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockRequest = { method: 'POST', url: '/api/v1/orders', body: {} };
    mockHost = {
      switchToHttp: () => ({ getResponse: () => mockResponse, getRequest: () => mockRequest }),
    } as unknown as ArgumentsHost;
  });

  it('should return 500 for unknown errors', () => {
    filter.catch(new Error('DB crashed'), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      statusCode: 500,
    }));
  });

  it('should return correct status for HttpException', () => {
    filter.catch(new HttpException('Not Found', 404), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should call Sentry captureException for 500+ errors', () => {
    filter.catch(new Error('Internal failure'), mockHost);
    expect(mockMonitoring.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ url: '/api/v1/orders', method: 'POST', status: 500 }),
    );
  });

  it('should NOT call Sentry for 4xx errors', () => {
    filter.catch(new HttpException('Bad Request', 400), mockHost);
    expect(mockMonitoring.captureException).not.toHaveBeenCalled();
  });

  it('should work without MonitoringService (graceful degradation)', () => {
    const filterNoSentry = new AllExceptionsFilter();
    expect(() => filterNoSentry.catch(new Error('crash'), mockHost)).not.toThrow();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should include timestamp in response', () => {
    filter.catch(new Error('test'), mockHost);
    const jsonCall = mockResponse.json.mock.calls[0][0];
    expect(jsonCall.timestamp).toBeDefined();
    expect(new Date(jsonCall.timestamp).getTime()).not.toBeNaN();
  });

  it('should flatten array messages from ValidationPipe', () => {
    const validationError = new HttpException({ message: ['field1 is required', 'field2 must be a string'] }, 400);
    filter.catch(validationError, mockHost);
    const jsonCall = mockResponse.json.mock.calls[0][0];
    expect(jsonCall.message).toEqual(['field1 is required', 'field2 must be a string']);
  });
});
