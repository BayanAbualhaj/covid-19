'use strict';
//requirement

const express = require('express');
const pg = require('pg')
const cors = require('cors');
const superAgent = require('superagent');
const override= require('method-override');
const app = express();

require('dotenv').config();

// cnficrations

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('./public'));
app.use(override('_method'));
app.set('view engine', 'ejs');

const PORT = process.env.PORT;

// let client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });



//routes 

app.get('/',handleHome);
app.get('/getCountryResults',handleResults);
app.get ('/allCountries', handleAllCountries);
app.post('/addToMyRecord',handleAddToMyRecord);
app.get('/addToMyRecord',handleMyRecordPage);
app.get('/myRecord/:id',handleOneRecord);
app.delete('/myRecord/:id',handleDelete);




//functions and handlers 

function handleHome(req,res){
  let url ='https://api.covid19api.com/world/total';

  superAgent.get(url).then(data=>{
    console.log(data.body);
    let body = data.body;

    res.render('index',{data:body});
  }).catch(error=>{
    console.log('an error happened :',error);
  });
}


function handleResults(req,res){
  let query=req.query;
  
  let country= query.country;
  let date=query.date;
  let todate=query.todate;

  let url=`https://api.covid19api.com/country/${country}/status/confirmed?from=${date}T00:00:00Z&to=${todate}T00:00:00Z`;

  superAgent.get(url).then(data=>{
    // console.log(data.body);
    res.render('getCountryResult',{results:data.body});
  }).catch(error=>{
    console.log('an error happened :',error);
  });

}

function  handleAllCountries(req,res){
  let url= 'https://api.covid19api.com/summary';

  superAgent.get(url).then(data=>{
    // console.log(data.body.Countries);
    let countries=data.body.Countries;
    let country;
    let totalConfirmed;
    let totalDeaths;
    let totalRecovered;
    let date;
    
    let arrayOfcountries=[];

    countries.forEach(element => {
      if(element){
        country=element.Country?element.Country: 'Country Not Found';
        totalConfirmed=element.TotalConfirmed?element.TotalConfirmed:'No Confirmed Cases';
        totalDeaths=element.TotalDeaths?element.TotalDeaths:'No Deaths';
        totalRecovered=element.TotalRecovered?element.TotalRecovered:'No Recovered Cases';
        date=element.Date?element.Date:'Not Available';
      }else{
        country='Country Not Found';
        totalConfirmed='No Confirmed Cases';
        totalDeaths='No Deaths';
        totalRecovered='No Recovered Cases';
        date='Not Available';
      }

      let newCountries= new CountyConst(country,totalConfirmed,totalDeaths,totalRecovered,date);

      arrayOfcountries.push(newCountries);
      console.log(arrayOfcountries);

      res.render('allCountries',{contriesDisplay:arrayOfcountries});
    });
  }).catch(error=>{
    console.log('an error happened :',error);
  });
}

function handleAddToMyRecord(req,res){
  let body=req.body;
  let country=body.country;
  let totalConfirmed=body.totalConfirmed;
  let totalDeaths=body.totalDeaths;
  let totalRecovered=body.totalRecovered;
  let date=body.date;
  
  let insertQuery= 'INSERT INTO cases(country,totalconfirmed,totaldeaths,totalrecovered,date) VALUES ($1,$2,$3,$4,$5) RETURNING *;';

  let safeValues=[country,totalConfirmed,totalDeaths,totalRecovered,date];

  client.query(insertQuery,safeValues).then(data=>{
    res.redirect('/addToMyRecord');
  }).catch(error=>{
    console.log('an error happened :',error);
  });

}

function handleMyRecordPage(req,res){
  let selectQuery='SELECT * FROM cases;';

  client.query(selectQuery).then(data=>{
    res.render('myRecord',{records:data.rows});
  }).catch(error=>{
    console.log('an error happened :',error);
  });
}

function handleOneRecord(req,res){
  let id = req.params.id;

  let selectQuery='SELECT * FROM cases WHERE id=$1;';
  let safeValues=[id];

  client.query(selectQuery,safeValues).then(data=>{
    let oneCountry=data.rows[0];
    res.render('details',{details:oneCountry});
  }).catch(error=>{
    console.log('an error happened :',error);
  });
}

function handleDelete(req,res){
  let id = req.params.id;
  let deleteQuery= 'DELETE FROM cases WHERE id=$1;';
  let safeValues=[id];
  client.query(deleteQuery,safeValues).then(()=>{
    res.redirect('/addToMyRecord');
  }).catch(error=>{
    console.log('an error happened :',error
    );
  });
}



function CountyConst(country,totalConfirmed,totalDeaths,totalRecovered,date){
  this.country=country;
  this.totalConfirmed=totalConfirmed;
  this.totalDeaths=totalDeaths;
  this.totalRecovered=totalRecovered;
  this.date=date;
}


client.connect().then(() => {
    app.listen(PORT, () => {
      console.log('listening on port ', PORT);
    });
  }).catch((error) => {
    console.log('an error happened :',error);
  });