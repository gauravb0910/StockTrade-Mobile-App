const express = require("express");
var cors = require('cors')
const path = require('path')
const app = express();
const { MongoClient } = require("mongodb");
const bodyParser = require('body-parser');

app.use(cors())

const PORT = process.env.PORT || 8080;
const FINHUB_API_KEY = 'cmvkv4hr01qhorpps1mgcmvkv4hr01qhorpps1n0'
const POLYGON_IO_API_KEY = '7pY23MpOHkuPCDQu_XMQjDTWl3xpJdmh'

const uri = "mongodb+srv://gaurav-test:R2lp475nwJbBDNSI@cluster0.se4dyfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

app.use(bodyParser.json());

app.get('/getStockSymbols/:query', (req, res) => {
  var ticker = req.params.query
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/search?q='+ticker+'&token='+FINHUB_API_KEY
    , "No Stock Symbol Found!"
    , ((obj) => obj.type === "Common Stock" && !obj.symbol.includes("."))
  );
})

app.get('/getStockDetails/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/stock/profile2?symbol='+ticker+'&token='+FINHUB_API_KEY
    , "Company Details Not Found"
  );
})

app.get('/getStockLatestPrice/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/quote?symbol='+ticker+'&token='+FINHUB_API_KEY
    , "Company Stock's Latest Price Not Found"
  );
})

app.get('/getCompanyNews/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  var today = new Date();
  var relative_date = new Date(new Date().setDate(today.getDate() - 8));
  performApiCall(
    res
    , 'https://finnhub.io/api/v1/company-news?symbol='+ticker+'&from='+convertToYYYYMMDDFormat(relative_date)+'&to='+convertToYYYYMMDDFormat(today)+'&token='+FINHUB_API_KEY
    , "Company's Latest News Not Found"
    , ( (newsObject) =>
          newsObject.hasOwnProperty('headline')
          && newsObject.hasOwnProperty('datetime')
          && newsObject.hasOwnProperty('url')
          && newsObject.hasOwnProperty('image')
          && !(newsObject.headline.trim() === "")
          && !(newsObject.url.trim() === "")
          && !(newsObject.image.trim() === "")
      )
  );
})

app.get('/getStockHistoricalData/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  var today = new Date();
  var relative_date = new Date(new Date().setFullYear(today.getFullYear() - 2));
  performApiCall(
      res
    , 'https://api.polygon.io/v2/aggs/ticker/'+ticker+'/range/1/day/'+convertToYYYYMMDDFormat(relative_date)+'/'+convertToYYYYMMDDFormat(today)+'?adjusted=true&sort=asc&apiKey='+POLYGON_IO_API_KEY
    , "Stock's Historical Data Not Found"
  );
})

app.get('/getStockPriceOnHourlyBasis/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  var today = new Date();
  var relative_date = new Date(new Date(new Date().setDate(today.getDate() - 7)));
  performApiCall(
      res
    , 'https://api.polygon.io/v2/aggs/ticker/'+ticker+'/range/1/hour/'+convertToYYYYMMDDFormat(relative_date)+'/'+convertToYYYYMMDDFormat(today)+'?adjusted=true&sort=asc&apiKey='+POLYGON_IO_API_KEY
    , "Stock's Hourly Price Data Not Found"
  );
})

app.get('/getStockRecommendation/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/stock/recommendation?symbol='+ticker+'&token='+FINHUB_API_KEY
    , "Stock's Recommendation Not Found"
  );
})

app.get('/getStockInsiderSentiment/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/stock/insider-sentiment?symbol='+ticker+'&from=2022-01-01&token='+FINHUB_API_KEY
    , "Stock's Insider Sentiment Not Found"
  );
})

app.get('/getCompanyPeers/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/stock/peers?symbol='+ticker+'&token='+FINHUB_API_KEY
    , "Company Peers Not Found"
  );
})

app.get('/getStockEarnings/:stock_ticker', (req, res) => {
  var ticker = req.params.stock_ticker
  performApiCall(
      res
    , 'https://finnhub.io/api/v1/stock/earnings?symbol='+ticker+'&token='+FINHUB_API_KEY
    , "Stock Earnings Not Found"
    , undefined
    , setNullValuesToZeroInObject
  );
})

function setNullValuesToZeroInObject(obj) {
  var newObject = {}
  Object.keys(obj).forEach((key) => obj[key] === null ? (newObject[key] = 0) : (newObject[key] = obj[key]));
  return newObject;
}

function convertToYYYYMMDDFormat(date){
  return date.toLocaleDateString('en-CA');
}

function performApiCall(res, url = "", error_message, filter_function = undefined, map_function = undefined) {
  fetch(url).then (response => {
    if (response.ok && response.status==200) {
      return response.json();
    } else {
      throw new Error(error_message);
    }
  }).then (async data => {
    if (data === null || data === undefined || Object.keys(data).length === 0) {
      res.json({"Error": error_message});
    }
    else {
      if (filter_function!==undefined) {
        if (Object.keys(data).includes("result")){
          data = data.result.filter(filter_function)
        } else {
          data = data.filter(filter_function)
        }
      }
      if (map_function!==undefined) {
        if (Object.keys(data).includes("result")){
          data = data.result.map(map_function)
        } else {
          data = data.map(map_function)
        }
      }
      res.json(data);
    }
  }).catch(error => {
    res.json(error);
  });
}

async function run() {
  try {
    await client.connect();
    app.locals.dbClient = client.db('StockTrade_Assignment3');
    console.log("CONNECTED");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

app.get('/portfolio/findAll', async (req, res) => {
  try {
    await client.connect();
    const wallet_collection = req.app.locals.dbClient.collection('wallet');
    const walletItem = await wallet_collection.findOne();
    const portfolio_collection = req.app.locals.dbClient.collection('portfolio');
    const portfolioItems = await portfolio_collection.find({}).toArray();
    res.status(200).json({"wallet_account":walletItem, "portfolio_data":portfolioItems});
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/portfolio/findOne/:stock_ticker', async (req, res) => {
  var ticker = req.params.stock_ticker;
  try {
    await client.connect();
    const wallet_collection = req.app.locals.dbClient.collection('wallet');
    const walletItem = await wallet_collection.findOne();
    const portfolio_collection = req.app.locals.dbClient.collection('portfolio');
    const portfolioItem = await portfolio_collection.findOne({ stock_ticker: ticker });
    res.status(200).json({"wallet_account":walletItem, "portfolio_data":portfolioItem});
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.post('/portfolio/updateOne/:stock_ticker', async (req, res) => {
  var ticker = req.params.stock_ticker;
  var reqBody = req.body;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('portfolio');
    const filter = { stock_ticker: ticker };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        stock_ticker: reqBody.stock_ticker,
        stock_company: reqBody.stock_company,
        quantity: Number(reqBody.quantity),
        total_cost: Number(reqBody.total_cost)
      },
    };
    const result = await collection.updateOne(filter, updateDoc, options);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/portfolio/deleteOne/:stock_ticker', async (req, res) => {
  var ticker = req.params.stock_ticker;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('portfolio');
    const query = { stock_ticker: ticker };
    const result = await collection.deleteOne(query);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/watchlist/findAll', async (req, res) => {
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('watchlist');
    const items = await collection.find({}).toArray();
    res.status(200).json(items);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/watchlist/findOne/:stock_ticker', async (req, res) => {
  var ticker = req.params.stock_ticker;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('watchlist');
    const item = await collection.findOne({ stock_ticker: ticker });
    res.status(200).json(item);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.post('/watchlist/insertOne', async (req, res) => {
  var reqBody = req.body;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('watchlist');
    const doc = {
      stock_ticker: reqBody.stock_ticker,
      stock_company: reqBody.stock_company
    };
    const result = await collection.insertOne(doc);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/watchlist/deleteOne/:stock_ticker', async (req, res) => {
  var ticker = req.params.stock_ticker;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('watchlist');
    const query = { stock_ticker: ticker };
    const result = await collection.deleteOne(query);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.get('/walletAndPortfolio/get', async (req, res) => {
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('wallet');
    const walletItem = await collection.findOne();
    const collection1 = req.app.locals.dbClient.collection('portfolio');
    const items = await collection1.find({}).toArray();
    res.status(200).json({"wallet_account":walletItem, "portfolio":items});
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.post('/wallet/update', async (req, res) => {
  var reqBody = req.body;
  try {
    await client.connect();
    const collection = req.app.locals.dbClient.collection('wallet');
    const filter = { };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        amount: Number(reqBody.amount)
      },
    };
    const result = await collection.updateOne(filter, updateDoc, options);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({Error: error.message});
  } finally {
    await client.close();
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});