/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getAddressEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getU64Decoder,
  getU64Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type IAccountMeta,
  type IAccountSignerMeta,
  type IInstruction,
  type IInstructionWithAccounts,
  type IInstructionWithData,
  type ReadonlyAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from '@solana/kit';
import { POD_COM_PROGRAM_ADDRESS } from '../programs';
import {
  expectAddress,
  expectSome,
  getAccountMetaFactory,
  type ResolvedAccount,
} from '../shared';
import {
  getChannelVisibilityDecoder,
  getChannelVisibilityEncoder,
  type ChannelVisibility,
  type ChannelVisibilityArgs,
} from '../types';

export const CREATE_CHANNEL_V2_DISCRIMINATOR = new Uint8Array([
  174, 160, 51, 205, 169, 202, 17, 144,
]);

export function getCreateChannelV2DiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(
    CREATE_CHANNEL_V2_DISCRIMINATOR
  );
}

export type CreateChannelV2Instruction<
  TProgram extends string = typeof POD_COM_PROGRAM_ADDRESS,
  TAccountAgentAccount extends string | IAccountMeta<string> = string,
  TAccountChannelAccount extends string | IAccountMeta<string> = string,
  TAccountParticipantAccount extends string | IAccountMeta<string> = string,
  TAccountCreator extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountAgentAccount extends string
        ? ReadonlyAccount<TAccountAgentAccount>
        : TAccountAgentAccount,
      TAccountChannelAccount extends string
        ? WritableAccount<TAccountChannelAccount>
        : TAccountChannelAccount,
      TAccountParticipantAccount extends string
        ? WritableAccount<TAccountParticipantAccount>
        : TAccountParticipantAccount,
      TAccountCreator extends string
        ? WritableSignerAccount<TAccountCreator> &
            IAccountSignerMeta<TAccountCreator>
        : TAccountCreator,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type CreateChannelV2InstructionData = {
  discriminator: ReadonlyUint8Array;
  name: string;
  description: string;
  visibility: ChannelVisibility;
  maxParticipants: number;
  feePerMessage: bigint;
};

export type CreateChannelV2InstructionDataArgs = {
  name: string;
  description: string;
  visibility: ChannelVisibilityArgs;
  maxParticipants: number;
  feePerMessage: number | bigint;
};

export function getCreateChannelV2InstructionDataEncoder(): Encoder<CreateChannelV2InstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['name', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['description', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
      ['visibility', getChannelVisibilityEncoder()],
      ['maxParticipants', getU32Encoder()],
      ['feePerMessage', getU64Encoder()],
    ]),
    (value) => ({ ...value, discriminator: CREATE_CHANNEL_V2_DISCRIMINATOR })
  );
}

export function getCreateChannelV2InstructionDataDecoder(): Decoder<CreateChannelV2InstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['name', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['description', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['visibility', getChannelVisibilityDecoder()],
    ['maxParticipants', getU32Decoder()],
    ['feePerMessage', getU64Decoder()],
  ]);
}

export function getCreateChannelV2InstructionDataCodec(): Codec<
  CreateChannelV2InstructionDataArgs,
  CreateChannelV2InstructionData
> {
  return combineCodec(
    getCreateChannelV2InstructionDataEncoder(),
    getCreateChannelV2InstructionDataDecoder()
  );
}

export type CreateChannelV2AsyncInput<
  TAccountAgentAccount extends string = string,
  TAccountChannelAccount extends string = string,
  TAccountParticipantAccount extends string = string,
  TAccountCreator extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  agentAccount?: Address<TAccountAgentAccount>;
  channelAccount?: Address<TAccountChannelAccount>;
  participantAccount?: Address<TAccountParticipantAccount>;
  creator: TransactionSigner<TAccountCreator>;
  systemProgram?: Address<TAccountSystemProgram>;
  name: CreateChannelV2InstructionDataArgs['name'];
  description: CreateChannelV2InstructionDataArgs['description'];
  visibility: CreateChannelV2InstructionDataArgs['visibility'];
  maxParticipants: CreateChannelV2InstructionDataArgs['maxParticipants'];
  feePerMessage: CreateChannelV2InstructionDataArgs['feePerMessage'];
};

export async function getCreateChannelV2InstructionAsync<
  TAccountAgentAccount extends string,
  TAccountChannelAccount extends string,
  TAccountParticipantAccount extends string,
  TAccountCreator extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = typeof POD_COM_PROGRAM_ADDRESS,
>(
  input: CreateChannelV2AsyncInput<
    TAccountAgentAccount,
    TAccountChannelAccount,
    TAccountParticipantAccount,
    TAccountCreator,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  CreateChannelV2Instruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountChannelAccount,
    TAccountParticipantAccount,
    TAccountCreator,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress = config?.programAddress ?? POD_COM_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agentAccount: { value: input.agentAccount ?? null, isWritable: false },
    channelAccount: { value: input.channelAccount ?? null, isWritable: true },
    participantAccount: {
      value: input.participantAccount ?? null,
      isWritable: true,
    },
    creator: { value: input.creator ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.agentAccount.value) {
    accounts.agentAccount.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])),
        getAddressEncoder().encode(expectAddress(accounts.creator.value)),
      ],
    });
  }
  if (!accounts.channelAccount.value) {
    accounts.channelAccount.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([99, 104, 97, 110, 110, 101, 108])
        ),
        getAddressEncoder().encode(expectAddress(accounts.creator.value)),
        addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(
          expectSome(args.name)
        ),
      ],
    });
  }
  if (!accounts.participantAccount.value) {
    accounts.participantAccount.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(
          new Uint8Array([112, 97, 114, 116, 105, 99, 105, 112, 97, 110, 116])
        ),
        getAddressEncoder().encode(
          expectAddress(accounts.channelAccount.value)
        ),
        getAddressEncoder().encode(expectAddress(accounts.agentAccount.value)),
      ],
    });
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.agentAccount),
      getAccountMeta(accounts.channelAccount),
      getAccountMeta(accounts.participantAccount),
      getAccountMeta(accounts.creator),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getCreateChannelV2InstructionDataEncoder().encode(
      args as CreateChannelV2InstructionDataArgs
    ),
  } as CreateChannelV2Instruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountChannelAccount,
    TAccountParticipantAccount,
    TAccountCreator,
    TAccountSystemProgram
  >;

  return instruction;
}

export type CreateChannelV2Input<
  TAccountAgentAccount extends string = string,
  TAccountChannelAccount extends string = string,
  TAccountParticipantAccount extends string = string,
  TAccountCreator extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  agentAccount: Address<TAccountAgentAccount>;
  channelAccount: Address<TAccountChannelAccount>;
  participantAccount: Address<TAccountParticipantAccount>;
  creator: TransactionSigner<TAccountCreator>;
  systemProgram?: Address<TAccountSystemProgram>;
  name: CreateChannelV2InstructionDataArgs['name'];
  description: CreateChannelV2InstructionDataArgs['description'];
  visibility: CreateChannelV2InstructionDataArgs['visibility'];
  maxParticipants: CreateChannelV2InstructionDataArgs['maxParticipants'];
  feePerMessage: CreateChannelV2InstructionDataArgs['feePerMessage'];
};

export function getCreateChannelV2Instruction<
  TAccountAgentAccount extends string,
  TAccountChannelAccount extends string,
  TAccountParticipantAccount extends string,
  TAccountCreator extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = typeof POD_COM_PROGRAM_ADDRESS,
>(
  input: CreateChannelV2Input<
    TAccountAgentAccount,
    TAccountChannelAccount,
    TAccountParticipantAccount,
    TAccountCreator,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress }
): CreateChannelV2Instruction<
  TProgramAddress,
  TAccountAgentAccount,
  TAccountChannelAccount,
  TAccountParticipantAccount,
  TAccountCreator,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = config?.programAddress ?? POD_COM_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    agentAccount: { value: input.agentAccount ?? null, isWritable: false },
    channelAccount: { value: input.channelAccount ?? null, isWritable: true },
    participantAccount: {
      value: input.participantAccount ?? null,
      isWritable: true,
    },
    creator: { value: input.creator ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.agentAccount),
      getAccountMeta(accounts.channelAccount),
      getAccountMeta(accounts.participantAccount),
      getAccountMeta(accounts.creator),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getCreateChannelV2InstructionDataEncoder().encode(
      args as CreateChannelV2InstructionDataArgs
    ),
  } as CreateChannelV2Instruction<
    TProgramAddress,
    TAccountAgentAccount,
    TAccountChannelAccount,
    TAccountParticipantAccount,
    TAccountCreator,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedCreateChannelV2Instruction<
  TProgram extends string = typeof POD_COM_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    agentAccount: TAccountMetas[0];
    channelAccount: TAccountMetas[1];
    participantAccount: TAccountMetas[2];
    creator: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
  };
  data: CreateChannelV2InstructionData;
};

export function parseCreateChannelV2Instruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedCreateChannelV2Instruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 5) {
    throw new Error('CreateChannelV2 instruction: Insufficient accounts provided. Expected at least required accounts for V2 channel creation');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      agentAccount: getNextAccount(),
      channelAccount: getNextAccount(),
      participantAccount: getNextAccount(),
      creator: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getCreateChannelV2InstructionDataDecoder().decode(instruction.data),
  };
}
