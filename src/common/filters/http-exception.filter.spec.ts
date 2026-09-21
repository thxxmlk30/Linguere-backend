import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  function buildHost(): ArgumentsHost {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method: 'GET', url: '/api/orders' }),
      }),
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('formate une HttpException avec son statut et son message', () => {
    filter.catch(new BadRequestException('Requête invalide'), buildHost());

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Requête invalide',
        path: '/api/orders',
        method: 'GET',
      }),
    );
  });

  it('formate une erreur générique non prévue en 500', () => {
    filter.catch(new Error('boom'), buildHost());

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'boom' }),
    );
  });

  it('gère une valeur rejetée qui n’est pas une instance d’Error', () => {
    filter.catch('erreur-brute', buildHost());

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Erreur interne du serveur',
      }),
    );
  });
});
