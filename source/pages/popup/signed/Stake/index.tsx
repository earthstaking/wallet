
import React, { useEffect, useState } from 'react';
import styles from './index.scss';

import Header from '~components/Header';

import { RouteComponentProps, withRouter } from 'react-router';
import clsx from 'clsx';
//import ICON_EARTH from '~assets/images/icon-512.png';
import { useSelector } from 'react-redux';
import { selectTokenByTokenPair, selectTokensInfo, selectTokensInfoById } from '~state/token';
import NextStepButton from '~components/NextStepButton';
import { keyable } from '~scripts/Background/types/IMainController';
import { useController } from '~hooks/useController';
//import { mint } from '@earthwallet/assets';
import useToast from '~hooks/useToast';
import ICON_EARTH from '~assets/images/icon-512.png';
import ICON_STAKE from '~assets/images/th/stake.svg';
import ICON_CARET from '~assets/images/icon_caret.svg';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

interface Props extends RouteComponentProps<{ address: string, tokenId: string }> {
}


const Stake = ({
  match: {
    params: { address, tokenId },
  },
}: Props) => {

  console.log(address);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<keyable>({ symbol: "", id: "" });
  const [selectedSecondAmount, setSelectedSecondAmount] = useState<number>(0);
  const [selectedSecondToken, setSelectedSecondToken] = useState<keyable>({ symbol: "", id: "" });

  const [tab, setTab] = useState<number>(0);
  const tokenInfo = useSelector(selectTokensInfoById(tokenId));
  const tokenPair = useSelector(selectTokenByTokenPair(address + "_WITH_" + tokenId));
  const tokenInfos = useSelector(selectTokensInfo);
  const controller = useController();
  const [pairRatio, setPairRatio] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [priceFetch, setPriceFetch] = useState<boolean>(false);
  const { show } = useToast();
  console.log(tokenPair, 'tokenPair');
  //const selectedTokenInfo = useSelector(selectedToken.id => selectTokensInfoById(selectedToken.id));
  useEffect((): void => {
    console.log('useEffect', selectedToken);
    if ((selectedToken.id != "") && selectedSecondToken.id != "" && selectedSecondToken.id != null) {
      console.log('useEffect', selectedToken, selectedSecondToken);

      setPriceFetch(true);
      controller.tokens.getPair(selectedToken.id, selectedSecondToken.id).then((response) => {
        console.log('do something', response);
        setPairRatio(response.ratio);
        setPriceFetch(false);
      });
    }
  }, [selectedToken.id, selectedSecondToken.id]);

  const mint = async () => {
    setLoading(true);
    const response = await controller.tokens.mint(tokenId, selectedToken.id);
    console.log(response);
    setPairRatio(response.ratio);
    show("Mint Complete! Updating Balances");
    await controller.tokens.getTokenBalances(address);
    show("Done!");
    setLoading(false);

  }

  const updateAmount = (amount: number) => {
    setSelectedAmount(amount);
    setSelectedSecondAmount(Number((pairRatio * amount)?.toFixed(3)));
  }
  const updateSecondAmount = (amount: number) => {
    if (pairRatio != 0) {
      let selectedAmount: number = amount / pairRatio;
      setSelectedAmount(Number(selectedAmount?.toFixed(3)));
      setSelectedSecondAmount(amount);
    }
    else {
      setSelectedSecondAmount(amount);
    }

  }
  console.log(tokenInfos);
  return (
    <div className={styles.page}>
      <Header
        type={'wallet'}
        text={'Stake EARTH'}
      ><div className={styles.empty} /></Header>

      <div className={styles.tabs}>
        <div
          onClick={() => setTab(0)}
          className={clsx(styles.tab, tab === 0 && styles.tab_active)}>
          Add
        </div>
        <div
          onClick={() => setTab(1)}
          className={clsx(styles.tab, tab === 1 && styles.tab_active)}>
          Stakes
        </div>
      </div>
      <div className={styles.tabcont}>
        <div className={styles.firstInputCont}>
          <TokenSelectorDropdown
            tokenInfo={tokenInfo}
            tokenInfos={tokenInfos}
            filterTokenId={tokenId}
            setSelectedAmount={updateAmount}
            selectedAmount={selectedAmount}
            setSelectedToken={setSelectedToken}
            selectedToken={selectedToken}
          />
          <div className={styles.swapbtn}><img src={ICON_STAKE} /></div>
        </div>
        <TokenSelectorDropdown
          tokenInfo={{}}
          tokenInfos={tokenInfos}
          filterTokenId={tokenId}
          setSelectedAmount={updateSecondAmount}
          selectedAmount={selectedSecondAmount}
          setSelectedToken={setSelectedSecondToken}
          selectedToken={selectedSecondToken}
        />

      </div>
      <div className={styles.statsCont}>
        <div className={styles.statsCol}>
          <div className={styles.statKey}>
            LP Fees
          </div>
          <div className={styles.statVal}>
            1%
          </div>
        </div>
        <div className={styles.statsCol}>
          <div className={styles.statKey}>
            Price
          </div>
          <div className={styles.statVal}>
            {priceFetch
              ? <SkeletonTheme color="#a5acbb36" highlightColor="#eee">
                <Skeleton width={60} />
              </SkeletonTheme>
              : selectedToken.symbol == ""
                ? "-"
                : pairRatio?.toFixed(3)
            }
          </div>
          <div className={styles.statKey}>
            {selectedToken.symbol}/{selectedSecondToken.symbol || "?"}
          </div>
        </div>
        <div className={styles.statsCol}>
          <div className={styles.statKey}>
            LP Share
          </div>
          <div className={styles.statVal}>
            2%
          </div>
        </div>
      </div>

      <div className={styles.nextCont}>
        <NextStepButton
          disabled={selectedAmount == 0}
          loading={loading}
          onClick={() => mint()}
        >
          {'Add Stake To Liquidity Pool'}
        </NextStepButton>
      </div>
    </div>
  );
};

export const TokenSelectorDropdown = ({
  filterTokenId,
  tokenInfo,
  tokenInfos,
  setSelectedAmount,
  selectedAmount,
  setSelectedToken,
  selectedToken
}: {
  filterTokenId?: string,
  tokenInfos: keyable,
  tokenInfo: keyable,
  setSelectedAmount: any,
  selectedAmount: any,
  setSelectedToken: any,
  selectedToken: any
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [overSecond, setOverSecond] = React.useState(false);
  useEffect(() => {
    setSelectedToken({ symbol: tokenInfo.symbol, id: tokenInfo.id })
  }, [tokenInfo !== null]);
  return <div className={styles.dropdownCont}>
    {(selectedToken.id == "" || selectedToken.id == null)
      ? <div>
        <div
          onClick={() => setOpen(!open)}
          className={clsx(styles.sinput, styles.selectDropdown)}>
          <div className={styles.noicon}></div>
          <div className={styles.label}>Select an asset</div>
          <img className={styles.careticon} src={ICON_CARET} />
        </div>
      </div>
      : <div className={clsx(styles.sinput, overSecond && styles.sinput_active)}>
        <div
          onClick={() => setOpen(!open)}
          className={styles.econt}>
          {tokenInfo.icon ? <img className={styles.eicon} src={ICON_EARTH}></img> : <div className={styles.eicon}>{selectedToken.symbol?.charAt(0)}</div>}
          <div>{selectedToken.symbol}</div>
          <img className={styles.careticon} src={ICON_CARET} />
        </div>
        <div className={styles.econtinput}>
          <div className={styles.maxBtn}>Max</div>
          <input
            onMouseOver={() => setOverSecond(true)}
            onMouseOut={() => setOverSecond(false)}
            autoCapitalize='off'
            autoCorrect='off'
            autoFocus={false}
            key={'price'}
            max="1.00"
            min="0.00"
            onChange={(e) => setSelectedAmount(parseFloat(e.target.value))}
            placeholder="8 decimal"
            required
            step="0.001"
            type="number"
            value={selectedAmount}
            className={styles.einput}></input>
          <div className={styles.balanceData}><span className={styles.balanceLabel}>Balance:</span><div className={styles.balanceText}>666 {selectedToken.symbol}</div></div>
        </div>
      </div>}
    {open && <div className={styles.tokenOptions}>
      {tokenInfos.filter((token: keyable) => token.id !== filterTokenId).map((token: keyable) => <div
        onClick={() => {
          setSelectedToken({
            symbol: token.symbol,
            id: token.id
          });
          setOpen(false);
        }}
        key={token.id}
        className={clsx(styles.sinput, styles.selectDropdown, styles.selectDropdownOption)}>
        <div className={styles.noicon} ></div>
        <div className={styles.label}>{token.symbol}</div>
      </div>)}
    </div>}
  </div>
}
export const SecondTokenInfo = ({ selectedToken, address }: { selectedToken: keyable, address: string }) => {
  console.log(selectedToken, 'SecondTokenInfo');
  const tokenPair = useSelector(selectTokenByTokenPair(address + "_WITH_" + selectedToken.id));

  return <div className={styles.inforow}>
    <div className={styles.infocolleft}>
      <div className={styles.eicon}>{selectedToken.symbol == "" ? "?" : selectedToken.symbol?.charAt(0)}
      </div>
      <div className={styles.symbol}>{selectedToken.symbol == "" ? "-" : selectedToken.symbol}</div>
    </div>
    <div className={styles.infocolright}>{selectedToken.symbol == "" ? "-" : tokenPair?.balance}</div>
  </div>
}

export default withRouter(Stake);