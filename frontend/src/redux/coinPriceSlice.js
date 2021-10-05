import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
// import { createSlice } from '@reduxjs/toolkit';
// import api from '@/api/api';
import { INITIAL_STATUS, SORT_STATUS } from '@/constants/reduxConstants';
import { testGetCoinInterestsList } from '@/mock/coinListMockData';
import { copy, includeKor, includeEng } from '@/utils/utils';
import api from '@/api/api';
import { setNewDataWithSymbol } from '@/utils/reduxUtils';

const initialState = {
  tabIndex: 0,
  selectedCoin: '',
  coinPriceList: {
    data: null,
    ...INITIAL_STATUS,
  },
  filteredCoinPriceList: {
    data: null,
  },
  nameStatus: {
    ...SORT_STATUS,
  },
  candleStickTimeDataList: {
    data: null,
    ...INITIAL_STATUS,
  },
  coinPriceDetailInfo: {
    data: null,
  },
};

/* eslint max-len: ["error", { "code": 150 }] */
export const getCoinPriceList = createAsyncThunk('coinPrice/getCoinPriceList', async () => {
  const [priceRes, interestsRes] = await Promise.all([await api.getCoinList(), await testGetCoinInterestsList()]);

  const newCoinPriceList = priceRes.data.data.map((coin) => {
    const { korean } = coin;

    const isEqual = interestsRes.data.some(({ korean: interestKorean }) => korean === interestKorean);

    return {
      ...coin,
      isInterest: isEqual,
    };
  });

  return {
    ...priceRes,
    data: [...newCoinPriceList],
  };
});

export const getCandleStick = createAsyncThunk('coinPrice/getCandleStick', async ({ symbol, gap }) => {
  const { data: originalData } = await api.getCandleStick({ symbol, gap });

  const newData = originalData.data.map(({ baseTime, openPrice, closePrice, highPrice, lowPrice }) => [
    Number(baseTime),
    Number(openPrice),
    Number(highPrice),
    Number(lowPrice),
    Number(closePrice),
  ]);

  return {
    ...originalData,
    data: newData,
  };
});

export const coinPriceSlice = createSlice({
  name: 'coinPrice',
  initialState,
  reducers: {
    setTabIndex: (state, action) => {
      const { value } = action.payload;
      state.tabIndex = value;

      if (value === 1) {
        state.filteredCoinPriceList.data = state.filteredCoinPriceList.data.filter(({ isInterest }) => isInterest);
        return;
      }
      state.filteredCoinPriceList.data = [...state.coinPriceList.data];
    },
    setSordStatus: (state, action) => {
      const { isSortByDescending, statusName } = state.nameStatus;
      const { type } = action.payload;

      state.nameStatus.isSortByDescending = isSortByDescending === 1 ? -1 : 1;

      if (type !== statusName) {
        state.nameStatus.isSortByDescending = -1;
      }

      state.nameStatus.statusName = type;

      const newData = copy(state.coinPriceList.data);
      newData.sort((prev, next) => {
        const prevValue = type === 'korean' ? prev[type] : Number(prev[type]);
        const nextValue = type === 'korean' ? next[type] : Number(next[type]);
        if (prevValue > nextValue) return 1 * state.nameStatus.isSortByDescending;
        if (prevValue < nextValue) return -1 * state.nameStatus.isSortByDescending;
        return 0;
      });
      state.filteredCoinPriceList.data = newData;
    },
    setSearchedCoin: (state, action) => {
      const { value } = action.payload;

      if (value === '') {
        state.filteredCoinPriceList.data = [...state.coinPriceList.data];
        return;
      }

      const filteredNewData = state.coinPriceList.data.filter(
        ({ korean, symbol }) => includeKor(korean, value) || includeEng(symbol, value),
      );

      state.filteredCoinPriceList.data = [...filteredNewData];
    },
    editInterestCoin: (state, action) => {
      const { symbol: payloadSymbol, isInterest: payloadIsInterest } = action.payload;

      const selectedCoin = state.filteredCoinPriceList.data.find(({ symbol }) => payloadSymbol === symbol);

      const newSelectedCoin = {
        ...selectedCoin,
        isInterest: !payloadIsInterest,
      };

      const newData = state.filteredCoinPriceList.data.map((coin) => {
        if (payloadSymbol === coin.symbol) {
          return {
            ...newSelectedCoin,
          };
        }
        return {
          ...coin,
        };
      });

      state.filteredCoinPriceList.data = [...newData];
    },
    // setSelectedCoin: (state, action) => {
    //   const { symbol: payloadSymbol } = action.payload;
    //   state.selectedCoin = payloadSymbol;
    //   // const tmp = state.coinPriceList.data.filter(({ symbol }) => symbol === payloadSymbol);
    //   // console.log(tmp);
    // },
    updateCoinList: (state, action) => {
      const { data: payloadData } = action.payload;
      const { data } = state.coinPriceList;
      if (!data) return;
      const copiedData = copy(data);
      const newData = setNewDataWithSymbol({ payloadData, copiedData });
      state.coinPriceList.data = [...newData];
      // console.log(newData);
      const { data: filteredData } = state.filteredCoinPriceList;
      if (!filteredData) return;
      const filteredCopiedData = copy(filteredData);
      const newFilteredData = setNewDataWithSymbol({
        payloadData,
        copiedData: filteredCopiedData,
      });
      // console.log(newFilteredData);
      state.filteredCoinPriceList.data = [...newFilteredData];
      // const newData = copiedData.map((coin) => {
      //   const findData = payloadData.find(({ symbol: payloadSymbol }) => `${coin.symbol}_KRW` === payloadSymbol);

      //   if (findData) {
      //     const { lowPrice, highPrice, value, volume, chgRate, chgAmt, closePrice } = findData;
      //     return {
      //       ...coin,
      //       closePrice,
      //       chgRate,
      //       chgAmt,
      //       accTradeValue: value,
      //       unitsTraded: volume,
      //       minPrice: lowPrice,
      //       maxPrice: highPrice,
      //     };
      //   }
      //   return {
      //     ...coin,
      //   };
      // });
    },
  },
  extraReducers: {
    [getCoinPriceList.pending]: (state) => {
      state.coinPriceList = {
        ...state.coinPriceList,
        isLoading: true,
        isError: false,
        status: 'loading',
      };
    },
    [getCoinPriceList.fulfilled]: (state, action) => {
      state.coinPriceList = {
        ...state.coinPriceList,
        data: action.payload.data,
        isLoading: false,
        isError: false,
        status: 'success',
      };

      state.filteredCoinPriceList.data = action.payload.data;
    },
    [getCoinPriceList.rejected]: (state) => {
      state.coinPriceList = {
        ...state.coinPriceList,
        isLoading: false,
        isError: true,
        status: 'fail',
      };
    },

    [getCandleStick.fulfilled]: (state, action) => {
      state.candleStickTimeDataList = {
        ...state.candleStickTimeDataList,
        data: action.payload.data,
        isLoading: false,
        isError: false,
        status: 'success',
      };
    },
  },
});

export const {
  setTabIndex,
  setSordStatus,
  setSearchedCoin,
  editInterestCoin,
  setSelectedCoin,
  updateCoinList,
} = coinPriceSlice.actions;

export default coinPriceSlice.reducer;
