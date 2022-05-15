/* eslint-disable no-unused-vars */
import React from 'react';
import axios from 'axios';
import { Form, Button, Alert, FormGroup } from 'react-bootstrap';
import './App.css';

const apikey = "KZlX04QDIvYSVKwG2oITsrmCTQZWrbJBK55df8Sf";

class App extends React.Component {

  constructor() {
    super();
    this.state = {
      currencies: null,
      bestPath: null,
      arbitrage: 1,
      baseCurrency: null,
      exchangeRates: new Map(),
      loadingExchangeRates: false,
      loadedExchangeRates: 0
    };

    this.getBestArbitragePath = this.getBestArbitragePath.bind(this);
  }

  async componentDidMount() {
    const response = await axios.get("https://api.currencyapi.com/v3/currencies?currencies=", { headers: { apikey: apikey } });
    var currencies = [];
    for (var currency in response.data.data) {
      currencies.push(currency);
    }
    this.setState({ currencies: currencies });
  }

  async getBestArbitragePath() {
    var path = [`1 ${this.state.baseCurrency}`];
    this.setState({ bestPath: path, arbitrage: 1 });
    if (!this.state.exchangeRates || this.state.exchangeRates.size === 0) {
      this.setState({ loadingExchangeRates: true });
      for (let i = 0; i < this.state.currencies.length; i++) {
        var currency = this.state.currencies[i];
        const response = await axios.get(`https://api.currencyapi.com/v3/latest?base_currency=${currency}`, { headers: { apikey: apikey } });
        this.state.exchangeRates.set(currency, response.data.data);
        this.setState({ loadedExchangeRates: this.state.exchangeRates.size })
      }
      this.setState({ loadingExchangeRates: false });
    }

    var otherCurrencies = new Set(this.state.currencies);
    otherCurrencies.delete(this.state.baseCurrency);
    this.getBestArbitrageFromCurrency(this.state.baseCurrency, 1, path, otherCurrencies);

    this.setState({ bestPath: path });
  }

  getBestArbitrageFromCurrency(startCurrency, startValue, path, remainingCurrencies) {
    if (remainingCurrencies.size === 0) {
      return path;
    }

    var bestAdditionalCurrencyValue = 0;
    var bestAdditionalCurrency = "";
    var bestAdditionalCurrencyArbitrageValue = 0;

    for (let newCurrency of remainingCurrencies) {
      var startCurrencyExchangeRates = this.state.exchangeRates.get(startCurrency);
      if (!startCurrencyExchangeRates) {
        continue;
      }
      var startCurrencyToNewCurrencyRate = startCurrencyExchangeRates[newCurrency];
      if (!startCurrencyToNewCurrencyRate) {
        continue;
      }

      var newCurrencyValue = startValue * startCurrencyToNewCurrencyRate.value;
      var newCurrencyExchangeRates = this.state.exchangeRates.get(newCurrency);
      if (!newCurrencyExchangeRates) {
        continue;
      }
      var newCurrencyToBaseCurrencyRate = newCurrencyExchangeRates[this.state.baseCurrency];
      if (!newCurrencyToBaseCurrencyRate) {
        continue;
      }

      var arbitrageValue = newCurrencyValue * newCurrencyToBaseCurrencyRate.value;
      if (arbitrageValue > bestAdditionalCurrencyArbitrageValue) {
        bestAdditionalCurrencyValue = newCurrencyValue;
        bestAdditionalCurrency = newCurrency;
        bestAdditionalCurrencyArbitrageValue = arbitrageValue;
      }
    }

    if (bestAdditionalCurrency === "") {
      path.add("N/A");
      return path;
    }

    if (startCurrency !== this.state.baseCurrency) {
      var startCurrencyToBaseCurrencyRate = this.state.exchangeRates.get(startCurrency)[this.state.baseCurrency].value;
      var currentArbitrageValue = startValue * startCurrencyToBaseCurrencyRate;
      if (currentArbitrageValue > bestAdditionalCurrencyArbitrageValue) {
        return path;
      }
    }

    path.push(`${(bestAdditionalCurrencyValue).toFixed(6)} ${bestAdditionalCurrency}`);
    remainingCurrencies.delete(bestAdditionalCurrency);
    this.setState({ bestPath: path, arbitrage: bestAdditionalCurrencyArbitrageValue });

    return this.getBestArbitrageFromCurrency(bestAdditionalCurrency, bestAdditionalCurrencyValue, path, remainingCurrencies)
  }

  renderCurrencyDropDown() {
    if (this.state.currencies === null) {
      return <Form.Select disabled />
    } else {
      return <Form.Select
        onChange={e => this.setState({
          baseCurrency: e.target.value === '' ? null : e.target.value,
          bestPath: null
        })}>
        <option />
        {this.state.currencies.map((currency) => {
          return <option key={currency}>{currency}</option>
        })}
      </Form.Select>
    }
  }

  render() {
    const disabled = this.state.currencies === null || this.state.baseCurrency === null || this.state.bestPath !== null;

    return (
      <div className='App'>
        <Form>
          <Form.Label>
            {this.state.currencies === null ? "Loading currencies..." : "Select a base currency"}
          </Form.Label>
          <FormGroup>
            {this.renderCurrencyDropDown()}
            <Button disabled={disabled} onClick={this.getBestArbitragePath} className="mt-3">
              Maximise Arbitrage
            </Button>
          </FormGroup>
        </Form>
        {(this.state.loadingExchangeRates || this.state.bestPath) &&
          <div>
            {this.state.loadingExchangeRates
              ?
              <Alert variant='primary' className='mt-3'>
                {`Loading exchange rates... ${Math.round(100 * this.state.loadedExchangeRates / this.state.currencies.length)}%`}
              </Alert>
              :
              <Alert variant='success' className='mt-3'>
                <Alert.Heading>
                  {`Maximum profit of ${(100 * (this.state.arbitrage - 1)).toFixed(4)}% with the below arbitrage path`}
                </Alert.Heading>
                <p>{`${[...this.state.bestPath].join(" => ")} => ${this.state.arbitrage.toFixed(6)} ${this.state.baseCurrency}`}</p>
              </Alert>
            }
          </div>
        }
      </div>
    );
  }
}

export default App;
