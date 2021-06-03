// Copyright 2021 @earthwallet/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { AccountJson, AccountWithChildren } from '@earthwallet/extension-base/background/types';
import type { Chain } from '@earthwallet/extension-chains/types';
import type { IconTheme } from '@polkadot/react-identicon/types';
import type { SettingsStruct } from '@polkadot/ui-settings/types';
import type { KeypairType } from '@polkadot/util-crypto/types';
import type { ThemeProps } from '../types';

import { faUsb } from '@fortawesome/free-brands-svg-icons';
import { faCopy } from '@fortawesome/free-regular-svg-icons';
import { faCodeBranch, faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import styled from 'styled-components';

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Link } from '../components';
import useMetadata from '../hooks/useMetadata';
import useOutsideClick from '../hooks/useOutsideClick';
import useToast from '../hooks/useToast';
import useTranslation from '../hooks/useTranslation';
import { DEFAULT_TYPE } from '../util/defaultType';
import getParentNameSuri from '../util/getParentNameSuri';
import { AccountContext, SelectedAccountContext, SettingsContext } from './contexts';
import Identicon from './Identicon';

export interface Props {
  actions?: React.ReactNode;
  address?: string | null;
  children?: React.ReactNode;
  className?: string;
  genesisHash?: string | null;
  isExternal?: boolean | null;
  isHardware?: boolean | null;
  isHidden?: boolean;
  name?: string | null;
  parentName?: string | null;
  suri?: string;
  toggleActions?: number;
  type?: KeypairType;
}

interface Recoded {
  account: AccountJson | null;
  formatted: string | null;
  genesisHash?: string | null;
  prefix?: number;
  type: KeypairType;
}

// find an account in our list
function findSubstrateAccount (accounts: AccountJson[], publicKey: Uint8Array): AccountJson | null {
  const pkStr = publicKey.toString();

  return accounts.find(({ address }): boolean =>
    decodeAddress(address).toString() === pkStr
  ) || null;
}

// find an account in our list
function findAccountByAddress (accounts: AccountJson[], _address: string): AccountJson | null {
  return accounts.find(({ address }): boolean =>
    address === _address
  ) || null;
}

// recodes an supplied address using the prefix/genesisHash, include the actual saved account & chain
function recodeAddress (address: string, accounts: AccountWithChildren[], chain: Chain | null, settings: SettingsStruct): Recoded {
  // decode and create a shortcut for the encoded address
  const publicKey = decodeAddress(address);

  // find our account using the actual publicKey, and then find the associated chain
  const account = findSubstrateAccount(accounts, publicKey);
  const prefix = chain ? chain.ss58Format : (settings.prefix === -1 ? 42 : settings.prefix);

  // always allow the actual settings to override the display
  return {
    account,
    formatted: encodeAddress(publicKey, prefix),
    genesisHash: account?.genesisHash,
    prefix,
    type: account?.type || DEFAULT_TYPE
  };
}

const ACCOUNTS_SCREEN_HEIGHT = 550;
const defaultRecoded = { account: null, formatted: null, prefix: 42, type: DEFAULT_TYPE };

function Address ({ address, children, className, genesisHash, isExternal, isHardware, name, parentName, suri, toggleActions, type: givenType }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { accounts } = useContext(AccountContext);
  const settings = useContext(SettingsContext);
  const [{ account, formatted, genesisHash: recodedGenesis, prefix, type }, setRecoded] = useState<Recoded>(defaultRecoded);
  const chain = useMetadata(genesisHash || recodedGenesis, true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [moveMenuUp, setIsMovedMenu] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const { show } = useToast();

  const { setSelectedAccount } = useContext(SelectedAccountContext);

  useOutsideClick(actionsRef, () => (showActionsMenu && setShowActionsMenu(!showActionsMenu)));

  useEffect((): void => {
    if (!address) {
      setRecoded(defaultRecoded);

      return;
    }

    const accountByAddress = findAccountByAddress(accounts, address);
    const recoded = (accountByAddress?.type === 'ethereum' || (!accountByAddress && givenType === 'ethereum'))
      ? { account: accountByAddress, formatted: address, type: 'ethereum' } as Recoded
      : recodeAddress(address, accounts, chain, settings);

    setRecoded(recoded || defaultRecoded);
  }, [accounts, address, chain, givenType, settings]);

  useEffect(() => {
    if (!showActionsMenu) {
      setIsMovedMenu(false);
    } else if (actionsRef.current) {
      const { bottom } = actionsRef.current.getBoundingClientRect();

      if (bottom > ACCOUNTS_SCREEN_HEIGHT) {
        setIsMovedMenu(true);
      }
    }
  }, [showActionsMenu]);

  useEffect((): void => {
    setShowActionsMenu(false);
  }, [toggleActions]);

  const theme = (
    chain?.icon
      ? chain.icon
      : type === 'ethereum'
        ? 'ethereum'
        : 'polkadot'
  ) as IconTheme;

  const _onCopy = useCallback((): void => show(t('Copied')), [show, t]);

  const Name = () => {
    const accountName = name || account?.name;
    const displayName = accountName || t('<unknown>');

    return (
      <>
        {!!accountName && (account?.isExternal || isExternal) && (
          (account?.isHardware || isHardware)
            ? <FontAwesomeIcon
              className='hardwareIcon'
              icon={faUsb}
              rotation={270}
              title={t('hardware wallet account')}
            />
            : <FontAwesomeIcon
              className='externalIcon'
              icon={faQrcode}
              title={t('external account')}
            />
        )}
        <span title={displayName}>{displayName}</span>
      </>);
  };

  const parentNameSuri = getParentNameSuri(parentName, suri);

  const getAddressComponent = () => {
    return (<div className='infoRow'>
      <Identicon
        className='identityIcon'
        iconTheme={theme}
        isExternal={isExternal}
        onCopy={_onCopy}
        prefix={prefix}
        value={formatted || address}
      />
      <div className='info'>
        {parentName
          ? (
            <>
              <div className='banner'>
                <FontAwesomeIcon
                  className='deriveIcon'
                  icon={faCodeBranch}
                />
                <div
                  className='parentName'
                  data-field='parent'
                  title={parentNameSuri}
                >
                  {parentNameSuri}
                </div>
              </div>
              <div className='name displaced'>
                <Name />
              </div>
            </>
          )
          : (
            <div
              className='name'
              data-field='name'
            >
              <Name />
            </div>
          )
        }
        {chain?.genesisHash && (
          <div
            className='banner chain'
            data-field='chain'
            style={
              chain.definition.color
                ? { backgroundColor: chain.definition.color }
                : undefined
            }
          >
            {chain.name.replace(' Relay Chain', '')}
          </div>
        )}
        <div className='addressDisplay'>
          <div
            className='fullAddress'
            data-field='address'
          >
            {formatted || address || t('<unknown>')}
          </div>
          <CopyToClipboard
            text={(formatted && formatted) || ''} >
            <FontAwesomeIcon
              className='copyIcon'
              icon={faCopy}
              onClick={_onCopy}
              size='sm'
              title={t('copy address')}
            />
          </CopyToClipboard>
        </div>
      </div>
    </div>);
  };

  return (
    <div className={className}>
      {name &&
              (<Link
                className='addressLink'
                onClick={() => address
                  ? setSelectedAccount({
                    address,
                    genesisHash,
                    isExternal: isExternal || undefined,
                    isHardware: isHardware || undefined,
                    name: name || undefined,
                    suri,
                    type
                  })
                  : {}}
                to={address ? `/wallet/home/${address}` : '/wallet/home'}>
                { getAddressComponent()}
              </Link>
              )
      }

      {
        !name && getAddressComponent()
      }

      {children}
    </div>
  );
}

export default styled(Address)(({ theme }: ThemeProps) => `
  background: ${theme.accountBackground};
  border: 1px solid ${theme.boxBorderColor};
  box-sizing: border-box;
  border-radius: 4px;
  margin-bottom: 8px;
  position: relative;

  .banner {
    font-size: 12px;
    line-height: 16px;
    position: absolute;
    top: 0;

    &.chain {
      background: ${theme.primaryColor};
      border-radius: 0 0 0 10px;
      color: white;
      padding: 0.1rem 0.5rem 0.1rem 0.75rem;
      right: 0;
      z-index: 1;
    }
  }

  .addressLink {
      &:hover {
        background-color: ${theme.buttonBackgroundHover};
        cursor: pointer;
    }
  }

  .addressDisplay {
    display: flex;
    justify-content: space-between;
    position: relative;
    max-width: 300px;

    .svg-inline--fa {
      width: 14px;
      height: 14px;
      color: ${theme.accountDotsIconColor};
      &:hover {
        color: ${theme.labelColor};
        cursor: pointer;
      }
    }

    .hiddenIcon, .visibleIcon {
      position: absolute;
      right: 2px;
      top: -18px;
    }

    .hiddenIcon {
      color: ${theme.errorColor};
      &:hover {
        color: ${theme.accountDotsIconColor};
      }
    }
  }

  .externalIcon, .hardwareIcon {
    margin-right: 0.3rem;
    color: ${theme.labelColor};
    width: 0.875em;
  }

  .identityIcon {
    margin-left: 15px;
    margin-right: 10px;

    & svg {
      width: 50px;
      height: 50px;
    }
  }

  .info {
    max-width: 248px;
  }

  .infoRow {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    height: 72px;
    border-radius: 4px;
    cursor: pointer;
  }

  img {
    max-width: 50px;
    max-height: 50px;
    border-radius: 50%;
  }

  .name {
    font-size: 16px;
    line-height: 22px;
    margin: 2px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 244px;
    white-space: nowrap;

    &.displaced {
      padding-top: 10px;
    }
  }

  .parentName {
    color: ${theme.labelColor};
    font-size: ${theme.inputLabelFontSize};
    line-height: 14px;
    overflow: hidden;
    padding: 0.25rem 0 0 0.8rem;
    text-overflow: ellipsis;
    width: 270px;
    white-space: nowrap;
  }

  .fullAddress {
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${theme.labelColor};
    font-size: 12px;
    line-height: 16px;
  }

  .detailsIcon {
    background: ${theme.accountDotsIconColor};
    width: 3px;
    height: 19px;

    &.active {
      background: ${theme.primaryColor};
    }
  }

  .deriveIcon {
    color: ${theme.labelColor};
    position: absolute;
    top: 5px;
    width: 9px;
    height: 9px;
  }

  .movableMenu {
    margin-top: -20px;
    right: 28px;
    top: 0;

    &.isMoved {
      top: auto;
      bottom: 0;
    }
  }
`);
