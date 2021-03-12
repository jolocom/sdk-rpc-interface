import { BaseMetadata } from '@jolocom/protocol-ts';

export const issuerConfig: {
  [k: string]: BaseMetadata;
} = {
  ProofOfEventOrganizerCredential: {
    type: ['VerifiableCredential', 'ProofOfEventOrganizerCredential'],
    name: 'Event Organizer Credential',
    context: [
      {
        ProofOfEventOrganizerCredential:
          'http://terms.condidi.com/ProofOfEventOrganizerCredential',
        schema: 'http://schema.org/',
        email: 'schema:email',
        name: 'schema:name',
      },
    ],
  },
  EventInvitationCredential: {
    type: ['VerifiableCredential', 'EventInvitationCredential'],
    name: 'Event Invitation',
    context: [
      {
        EventInvitationCredential:
          'http://terms.condidi.com/EventInvitationCredential',
        schema: 'http://schema.org/',
        presenter: 'schema:performer',
        name: 'schema:name',
        about: 'schema:about',
        time: 'schema:doorTime',
        location: 'schema:location',
      },
    ],
  },
  ProofOfEventAttendanceCredential: {
    type: ['VerifiableCredential', 'ProofOfEventAttendanceCredential'],
    name: 'Event Participation Credential',
    context: [
      {
        EventInvitationCredential:
          'http://terms.condid.com/EventInvitationCredential',
        schema: 'http://schema.org/',
        presenter: 'schema:performer',
        name: 'schema:name',
        about: 'schema:about',
        time: 'schema:doorTime',
        location: 'schema:location',
      },
    ],
  },
};

export const serverConfig = {
  // host/ip to listen on locally
  host: process.env.LISTEN_HOST || '0.0.0.0',

  // port to listen on locally
  port: parseInt(process.env.LISTEN_PORT || '4040'),

  // Password for service agent (JolocomSDK Agent)
  agentPassword: process.env.AGENT_PASSWORD || 'hunter2',

  // Database configuration for service agent
  ormconfig: {
    type: 'sqlite',
    database: (process.env.DATABASE_DIR || `${__dirname}/..`) + '/db.sqlite3',
    logging: ['error', 'warn', 'schema'],
    entities: [...require('@jolocom/sdk-storage-typeorm').entityList],
    migrations: [__dirname + '/migrations/*.ts'],
    migrationsRun: true,
    synchronize: true,
    cli: {
      migrationsDir: __dirname + '/migrations',
    },
  }
}
