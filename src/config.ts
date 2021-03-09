import { BaseMetadata } from '@jolocom/protocol-ts';

export const issuableCredentialTypes: {
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
