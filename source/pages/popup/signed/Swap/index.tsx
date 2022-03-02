
import React, { useEffect, useState } from 'react';
import styles from './index.scss';

import Header from '~components/Header';

import { RouteComponentProps, useHistory, withRouter } from 'react-router';
//import ICON_EARTH from '~assets/images/icon-512.png';
//import ICON_CARET from '~assets/images/icon_caret.svg';
import ICON_SWAP from '~assets/images/icon_swap.svg';
//import clsx from 'clsx';
import NextStepButton from '~components/NextStepButton';
import { useSelector } from 'react-redux';
import { selectTokenByTokenPair, selectTokensInfo, selectTokensInfoById } from '~state/token';
import { keyable } from '~scripts/Background/types/IAssetsController';
import TokenSelectorDropdown from '~components/TokenSelectorDropdown';
import useToast from '~hooks/useToast';
import { useController } from '~hooks/useController';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import useQuery from '~hooks/useQuery';
import ICON_MINT from '~assets/images/icon_mint.svg';
import clsx from 'clsx';

interface Props extends RouteComponentProps<{ address: string, tokenId: string }> {
}


const Swap = ({
  match: {
    params: { address, tokenId },
  },
}: Props) => {
  const queryParams = useQuery();
  const type: string = queryParams.get('type') || '';

  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<keyable>({ symbol: "", id: "" });
  const [selectedSecondAmount, setSelectedSecondAmount] = useState<number>(0);
  const [selectedSecondToken, setSelectedSecondToken] = useState<keyable>({ symbol: "", id: "" });

  const tokenInfo = useSelector(selectTokensInfoById(tokenId));
  console.log(tokenInfo)
  const tokenPair = useSelector(selectTokenByTokenPair(address + "_WITH_" + tokenId));
  const tokenInfos = useSelector(selectTokensInfo);
  const { show } = useToast();
  const [pairRatio, setPairRatio] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);

  const controller = useController();
  const [priceFetch, setPriceFetch] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const history = useHistory();

  console.log(tokenPair, tokenInfos);

  useEffect((): void => {
    console.log('useEffect', selectedToken);
    if ((selectedToken.id != "") && selectedSecondToken.id != "" && selectedSecondToken.id != null) {
      console.log('useEffect', selectedToken, selectedSecondToken);

      setPriceFetch(true);
      controller.tokens.getPair(selectedToken.id, selectedSecondToken.id).then((response) => {
        setTotalSupply(response?.stats?.total_supply);
        setPairRatio(response.ratio);
        setPriceFetch(false);
      });
    }
  }, [selectedToken.id, selectedSecondToken.id]);

  const updateAmount = (amount: number) => {
    if (selectedSecondToken?.id == null) {
      show("Select second token!");
      return;
    }
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
  const swap = async () => {
    setLoading(true);
    const response = await controller.tokens.swap(selectedToken.id, selectedSecondToken.id, selectedAmount);
    console.log(response);
    setPairRatio(response.ratio);
    setTotalSupply(response?.stats?.total_supply);
    show("Stake Complete! Updating Balances");
    await controller.tokens.getTokenBalances(address);
    show("Done!");
    setLoading(false);

  }

  const mint = async () => {
    const txnId = await controller.tokens.createMintTx({
      from: selectedToken.id,
      to: selectedSecondToken.id,
      fromAmount: selectedAmount.toString(),
      address,
      pairRatio: pairRatio.toString()
    })
    history.push('/transaction/confirm/' + txnId);
    console.log(txnId);
  }
  const swapSelectedTokens = () => {
    const _selectedToken = { ...selectedToken };
    const _selectedSecondToken = { ...selectedSecondToken };

    setSelectedToken(_selectedSecondToken);
    setSelectedSecondToken(_selectedToken);
  }
  return (
    <div className={styles.page}>
      <Header
        type={'wallet'}
        text={type == 'mint' ? 'Mint' : 'Swap'}
      ><div className={styles.empty} /></Header>
      <div>
        <div className={styles.etxt}>Earth Wallet connects you to the fastest,
          most secure decentralized exchange protocols in the world.</div>

        <div className={styles.swapCont}>
          <div className={styles.firstInputCont}>
            <TokenSelectorDropdown
              tokenInfo={{ symbol: 'ICP', id: 'ICP', type: 'network' }}
              tokenInfos={tokenInfos}
              filterTokenId={tokenId}
              setSelectedAmount={updateAmount}
              selectedAmount={selectedAmount}
              setSelectedToken={setSelectedToken}
              selectedToken={selectedToken}
              address={address}
            />
            <div
              onClick={() => type == 'mint' ? console.log() : swapSelectedTokens()}
              className={styles.swapbtn}><img src={type == 'mint' ? ICON_MINT : ICON_SWAP} /></div>
          </div>
          <TokenSelectorDropdown
            tokenInfo={{ symbol: 'SDR', id: tokenId }}
            tokenInfos={tokenInfos}
            setSelectedAmount={updateSecondAmount}
            selectedAmount={selectedSecondAmount}
            setSelectedToken={setSelectedSecondToken}
            selectedToken={selectedSecondToken}
            address={address}
          />
        </div>
      </div>
      <div className={styles.statsCont}>
        <div className={styles.statsCol}>
          <div className={styles.statKey}>
            {type == "mint" ? "Mint Fees" : "Swap Fees"}
          </div>
          <div className={clsx(styles.statVal, styles.statVal_small)}>
            {type == "mint" ? "0.0002 ICP" : "0.3%"}
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
              : selectedToken?.symbol == ""
                ? "-"
                : pairRatio?.toFixed(3)
            }
          </div>
          <div className={styles.statKey}>
            {selectedToken?.symbol}/{selectedSecondToken?.symbol || "?"}
          </div>
        </div>
        <div className={styles.statsCol}>
          <div className={styles.statKey}>
            Total Supply
          </div>
          <div className={styles.statVal}>
            {priceFetch
              ? <SkeletonTheme color="#a5acbb36" highlightColor="#eee">
                <Skeleton width={45} />
              </SkeletonTheme>
              : selectedToken?.symbol == ""
                ? "-"
                : totalSupply
            }
          </div>
        </div>
      </div>
      {false && <div className={styles.txnBtnCont}><div className={styles.txnBtn}>Transaction Settings</div></div>
      }
      <div className={styles.nextCont}>
        <NextStepButton
          disabled={selectedAmount == 0}
          loading={loading}
          onClick={() => type == 'mint' ? mint() : swap()}
        >
          {type == 'mint' ? 'Next' : 'Swap'}
        </NextStepButton>
      </div>
    </div >
  );
};


export default withRouter(Swap);