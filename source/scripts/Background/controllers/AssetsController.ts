import { CGECKO_PRICE_API } from '~global/constant';
import { updateFiatPrice } from '~state/assets';
import { IAssetState } from '~state/assets/types';
import store from '~state/store';
import type { IAssetsController, keyable } from '../types/IAssetsController';
import { createEntity, storeEntities, updateEntities } from '~state/entities';
import { getNFTsFromCanisterExt } from '@earthwallet/assets';
import { parseBigIntToString } from '~utils/common';
import LIVE_ICP_NFT_LIST_CANISTER_IDS from '~global/nfts';
import { canisterAgentApi, getTokenIdentifier } from '@earthwallet/assets';
import { isArray } from 'lodash';

export default class AssetsController implements IAssetsController {
  fetchFiatPrice = async (currency = 'USD') => {
    try {
      const assetState: IAssetState = store.getState().assets;
      const { activeAssetId } = assetState;

      if (!activeAssetId) {
        return;
      }

      const data = await (
        await fetch(
          `${CGECKO_PRICE_API}?ids=${activeAssetId},bitcoin&vs_currencies=${currency}&include_24hr_change=true`
        )
      ).json();

      store.dispatch(
        updateFiatPrice({
          id: activeAssetId,
          price: data[activeAssetId][currency],
          priceChange: data[activeAssetId][`${currency}_24h_change`],
        })
      );
      return;
    } catch (error) {
      console.log('fecthing CGECKO_PRICE_API error => ', error);
      return;
    }
  };

  fetchFiatPrices = async (symbols: keyable, currency = 'USD') => {
    try {
      const activeAssetIds = symbols.toString();

      store.dispatch(
        storeEntities({
          entity: 'prices',
          data: symbols.map((symbol: string) => {
            return { id: symbol, loading: true, error: false };
          }),
        })
      );
      const data = await (
        await fetch(
          `${CGECKO_PRICE_API}?ids=${activeAssetIds}&vs_currencies=${currency}&include_24hr_change=true`
        )
      ).json();
      store.dispatch(
        storeEntities({
          entity: 'prices',
          data: Object.keys(data).map((coinGeckoId) => {
            return {
              id: coinGeckoId,
              ...data[coinGeckoId],
              loading: false,
              error: false,
            };
          }),
        })
      );
      return;
    } catch (error) {
      console.log('fecthing CGECKO_PRICE_API error => ', error);
    }
    return;
  };

  fetchICPAssets = async (account: keyable, canisterId: string) => {
    const tokens: keyable = await getNFTsFromCanisterExt(
      canisterId,
      account.address
    );
    const parsedTokens = tokens.map((token: keyable) => ({
      id: token.tokenIdentifier,
      address: account.address,
      canisterId,
      ...parseBigIntToString(token),
    }));

    return parsedTokens;
  };

  fetchEarthEXTCollection = async (collectionId: string) => {
    console.log('fetchEarthEXTCollection');
    //const state = store.getState();

    let response;
    let responseListing;

    response = await canisterAgentApi(collectionId, 'getRegistry');
    response.map((item: keyable) =>
      store.dispatch(
        storeEntities({
          entity: 'assets',
          data: [
            {
              id: getTokenIdentifier(collectionId, item[0]),
              index: item[0],
              tokenIndex: item[0],
              tokenIdentifier: getTokenIdentifier(collectionId, item[0]),
              canisterId: collectionId,
              address: item[1],
              image: `https://${collectionId}.raw.ic0.app/?cc=0&type=thumbnail&tokenid=${getTokenIdentifier(
                collectionId,
                item[0]
              )}`,
            },
          ],
        })
      )
    );

    /*   store.dispatch(
      storeEntities({
        entity: 'collections',
        data: [{ id: collectionId, loading: true }],
      })
    ); */
    responseListing = await canisterAgentApi(collectionId, 'listings');
    console.log(response, responseListing, 'fetchCollection');

    responseListing.map((item: keyable) =>
      store.dispatch(
        updateEntities({
          entity: 'assets',
          key: getTokenIdentifier(collectionId, item[0]),
          data: {
            forSale: item[1] && item[1].price.toString() ? true : false,
            price: item[1] && item[1].price.toString(),
          },
        })
      )
    );
    /*     store.dispatch(
      storeEntities({
        entity: 'collections',
        data: [{ id: collectionId, loading: false }],
      })
    ); */
  };

  fetchEarthNFT = async (collectionId: string, tokenId: number) => {
    console.log('fetchEarthNFT', collectionId, tokenId);
    store.dispatch(
      updateEntities({
        entity: 'assets',
        key: getTokenIdentifier(collectionId, tokenId),
        data: {
          loading: true,
        },
      })
    );
    const response = await canisterAgentApi(
      collectionId,
      'getListingByTokenID',
      tokenId
    );
    const forSale = response[0] == null ? false : true;

    store.dispatch(
      updateEntities({
        entity: 'assets',
        key: getTokenIdentifier(collectionId, tokenId),
        data: {
          loading: false,
          forSale,
          info: {
            price:
              response[0] == null
                ? 0
                : typeof response[0][1].price == 'bigint'
                ? response[0][1].price.toString()
                : response[0][1].price,
          },
        },
      })
    );
  };
  getCollectionStats = async () => {
    let allStats: keyable = [];
    const state = store.getState();

    if (state.entities.collectionStats == null) {
      store.dispatch(createEntity({ entity: 'collectionStats' }));
    }
    for (const [
      index,
      canisterId,
    ] of LIVE_ICP_NFT_LIST_CANISTER_IDS.entries()) {
      let response: keyable = [];
      try {
        store.dispatch(
          storeEntities({
            entity: 'collectionStats',
            data: [
              {
                id: canisterId,
                loading: true,
              },
            ],
          })
        );
        const response: keyable = await canisterAgentApi(canisterId, 'stats');
        allStats[index] = response;
      } catch (error) {
        store.dispatch(
          storeEntities({
            entity: 'collectionStats',
            data: [
              {
                id: canisterId,
                error: 'Error with method stats',
                loading: false,
              },
            ],
          })
        );
        console.log(error);
      }

      if (isArray(response) && response?.length > 0) {
        const stats = {
          total: (Number(response[0] / 1000000n) / 100).toFixed(2),
          high: (Number(response[1] / 1000000n) / 100).toFixed(2),
          low: (Number(response[2] / 1000000n) / 100).toFixed(2),
          floor: (Number(response[3] / 1000000n) / 100).toFixed(2),
          listings: Number(response[4]),
          tokens: Number(response[5]),
          sales: Number(response[6]),
          average: Number(response[6])
            ? (Number(response[0] / (response[6] * 1000000n)) / 100).toFixed(2)
            : '-',
        };
        store.dispatch(
          storeEntities({
            entity: 'collectionStats',
            data: [
              {
                id: canisterId,
                ...stats,
                loading: false,
              },
            ],
          })
        );
      }
    }
  };

  getICPAssetsOfAccount = async (account: keyable) => {
    let allTokens: keyable = [];
    store.dispatch(
      storeEntities({
        entity: 'assetsCount',
        data: [
          {
            id: account.address,
            symbol: account.symbol,
            loading: true,
            error: false,
          },
        ],
      })
    );

    try {
      for (const [
        index,
        canisterId,
      ] of LIVE_ICP_NFT_LIST_CANISTER_IDS.entries()) {
        if (canisterId === 'ntwio-byaaa-aaaak-qaama-cai') {
          const response = await canisterAgentApi(
            canisterId,
            'tokens_ext',
            account.address
          );

          allTokens[index] = response.map((_token: any[]) => {
            const id = getTokenIdentifier(canisterId, _token[0]);
            this.fetchEarthNFT(canisterId, _token[0]);
            return {
              id,
              tokenIdentifier: id,
              address: _token[1],
              tokenIndex: _token[0],
              canisterId,
            };
          });
        } else {
          allTokens[index] = await this.fetchICPAssets(account, canisterId);
        }
      }
      let tokens = allTokens.flat();
      if (tokens.length === 0) {
        store.dispatch(
          storeEntities({
            entity: 'assetsCount',
            data: [
              {
                id: account.address,
                symbol: account.symbol,
                count: 0,
                loading: false,
              },
            ],
          })
        );
      } else {
        store.dispatch(
          storeEntities({
            entity: 'assetsCount',
            data: [
              {
                id: account.address,
                symbol: account.symbol,
                count: tokens.length,
                loading: false,
              },
            ],
          })
        );

        const state = store.getState();
        const existingAssets =
          state.entities.assets?.byId &&
          Object.keys(state.entities.assets?.byId)
            ?.map((id) => state.entities.assets.byId[id])
            .filter((assets) => assets.address === account.address);
        const existingCount = existingAssets?.length;

        if (existingCount != tokens?.length) {
          existingAssets?.map((token: keyable) =>
            store.dispatch(
              storeEntities({
                entity: 'assets',
                data: [{ ...token, ...{ address: '' } }],
              })
            )
          );
        }
        //cache the assets
        tokens.map((token: keyable) =>
          store.dispatch(
            storeEntities({
              entity: 'assets',
              data: [token],
            })
          )
        );
      }
    } catch (error) {
      console.log('Unable to load assets', error);
      store.dispatch(
        storeEntities({
          entity: 'assetsCount',
          data: [
            {
              id: account.address,
              symbol: account.symbol,
              count: 0,
              loading: false,
              errorMessage: 'Unable to load assets',
              error: true,
            },
          ],
        })
      );
    }
  };

  getAssetsOfAccountsGroup = async (accountsGroup: keyable[][]) => {
    for (const accounts of accountsGroup) {
      for (const account of accounts.filter(
        (account) => account.symbol === 'ICP'
      )) {
        await this.getICPAssetsOfAccount(account);
      }
    }
  };

  updateTokenCollectionDetails = async (asset: keyable) => {
    if (asset?.canisterId === 'ntwio-byaaa-aaaak-qaama-cai') {
      this.fetchEarthNFT(asset?.canisterId, asset?.tokenIndex);
      return;
    }

    const allTokens: keyable = await this.fetchICPAssets(
      asset.address,
      asset.canisterId
    );

    let tokens = allTokens.flat();
    tokens.map((token: keyable) =>
      store.dispatch(
        storeEntities({
          entity: 'assets',
          data: [token],
        })
      )
    );
  };

  updateTokenDetails = async ({
    id,
    address,
    price,
  }: {
    id: string;
    address: string;
    price?: number;
  }) => {
    if (price === undefined || price === null) {
      store.dispatch(
        updateEntities({
          entity: 'assets',
          key: id,
          data: { address },
        })
      );
    } else if (price === 0) {
      store.dispatch(
        updateEntities({
          entity: 'assets',
          key: id,
          data: {
            address,
            forSale: false,
          },
        })
      );
    } else {
      store.dispatch(
        updateEntities({
          entity: 'assets',
          key: id,
          data: {
            address,
            forSale: true,
            info: { price: price * 100000000 },
          },
        })
      );
    }
  };
}
