import { IocContainer, ServiceIdentifier } from 'tsoa';
import { container } from 'tsyringe';

export const iocContainer: IocContainer = {
  get: <T>(controller: ServiceIdentifier<T>): T => {
    return container.resolve<T>(controller as any);
  },
};
