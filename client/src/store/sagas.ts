import { takeEvery } from 'redux-saga/effects';
import { JsonRpcProvider, Transaction, TransactionResponse, TransactionReceipt, BrowserProvider, Signer } from 'ethers';

import apolloClient from '../apollo/client';
import { Action, Actions } from '../types';
import { SaveTransaction } from '../queries';
import { navigate } from '../components/NaiveRouter';

type Payload = {
  values: {
    recipient: string,
    amount: bigint
  }
}

function* sendTransaction(action: Action<Payload>) {
  const provider = new JsonRpcProvider('http://localhost:8545');

  // this could have been passed along in a more elegant fashion,
  // but for the purpouses of this scenario it's good enough
  // @ts-ignore
  const walletProvider = new BrowserProvider(window.ethereum);

  const signer: Signer = yield walletProvider.getSigner();

  const { recipient, amount } =  action.payload.values

  const transaction = {
    to: recipient,
    value: amount,
  };

  try {
    const txResponse: TransactionResponse = yield signer.sendTransaction(transaction);
    const response: TransactionReceipt = yield txResponse.wait();

    const receipt: Transaction = yield response.getTransaction();
    console.log('receipt', receipt)
    const variables = {
      transaction: {
        gasLimit: (receipt.gasLimit && receipt.gasLimit.toString()) || '0',
        gasPrice: (receipt.gasPrice && receipt.gasPrice.toString())|| '0',
        to: receipt.to,
        from: receipt.from,
        value: (receipt.value && receipt.value.toString()) || '',
        data: receipt.data || null,
        chainId: (receipt.chainId && receipt.chainId.toString()) || '1377',
        hash: receipt.hash,
      }
    };
    yield apolloClient.mutate({
      mutation: SaveTransaction,
      variables,
    });

    yield navigate(`/transaction/${variables.transaction.hash}`);
  } catch (error) {
    console.error('error', error)
  }

}

export function* rootSaga() {
  yield takeEvery(Actions.SendTransaction, sendTransaction);
}
