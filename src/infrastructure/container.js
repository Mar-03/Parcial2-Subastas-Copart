import { getDatabaseAdapter } from './database/firebase-admin';
import { createBcryptPasswordHasher } from './auth/bcrypt.password-hasher';
import { createJwtTokenService } from './auth/jwt.token-service';
import { createFirebaseBidRepository } from './repositories/firebase-bid.repository';
import { createFirebaseUserRepository } from './repositories/firebase-user.repository';
import { createFirebaseVehicleRepository } from './repositories/firebase-vehicle.repository';
import { createRealtimePublisher } from './realtime/socket-io.publisher';

import { CheckHealthUseCase } from '@/application/use-cases/check-health.use-case';
import {
  LoginUserUseCase,
  RegisterUserUseCase,
  ResolveCurrentUserUseCase,
} from '@/application/use-cases/auth.use-cases';
import {
  CreateVehicleUseCase,
  GetVehicleBidsUseCase,
  GetVehicleDetailUseCase,
  ListMyVehiclesUseCase,
  ListVehiclesUseCase,
  UpdateVehicleUseCase,
} from '@/application/use-cases/vehicle.use-cases';
import { PlaceBidUseCase } from '@/application/use-cases/place-bid.use-case';

/**
 * COMPOSITION ROOT (raiz de composicion) de la arquitectura hexagonal.
 *
 * Aqui se decide QUE implementacion se usa para cada puerto:
 *   puerto  ->  adaptador Firebase Realtime Database / bcryptjs / jsonwebtoken / Socket.IO
 *
 * Las capas de dominio y aplicacion no conocen Firebase, SQL, React ni HTTP.
 */

let container = null;

function buildContainer() {
  // --- Adaptadores (infraestructura) ---
  const userRepository = createFirebaseUserRepository();
  const vehicleRepository = createFirebaseVehicleRepository();
  const bidRepository = createFirebaseBidRepository();
  const database = getDatabaseAdapter();
  const passwordHasher = createBcryptPasswordHasher();
  const tokenService = createJwtTokenService();
  const realtimePublisher = createRealtimePublisher();

  // --- Casos de uso (aplicacion) ---
  const repositories = { userRepository, vehicleRepository, bidRepository };
  const auth = { passwordHasher, tokenService };

  return {
    // Puertos
    userRepository,
    vehicleRepository,
    bidRepository,
    database,
    passwordHasher,
    tokenService,
    realtimePublisher,

    // Casos de uso
    registerUser: new RegisterUserUseCase({ ...repositories, ...auth }),
    loginUser: new LoginUserUseCase({ ...repositories, ...auth }),
    resolveCurrentUser: new ResolveCurrentUserUseCase({ ...repositories, ...auth }),
    listVehicles: new ListVehiclesUseCase(repositories),
    getVehicleDetail: new GetVehicleDetailUseCase(repositories),
    getVehicleBids: new GetVehicleBidsUseCase(repositories),
    createVehicle: new CreateVehicleUseCase(repositories),
    updateVehicle: new UpdateVehicleUseCase(repositories),
    listMyVehicles: new ListMyVehiclesUseCase(repositories),
    placeBid: new PlaceBidUseCase({ ...repositories, realtimePublisher }),
    checkHealth: new CheckHealthUseCase({ ...repositories, database }),
  };
}

/** Devuelve el contenedor singleton. No se conecta a Firebase al construirlo. */
export function getContainer() {
  if (!container) {
    container = buildContainer();
  }
  return container;
}
