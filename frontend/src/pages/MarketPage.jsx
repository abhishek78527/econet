import { useState, useEffect, useCallback } from 'react'
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiStar, FiSearch, FiDollarSign, FiBarChart2, FiGlobe, FiBell } from 'react-icons/fi'
import toast from 'react-hot-toast'

// ── Free APIs (no key needed) ────────────────────────────────────────────────
// Exchange rates: frankfurter.app (free, no key)
// Crypto: CoinGecko public API (free, no key)
// Stocks: we use mock data with realistic values + simulated live updates
// Market news: curated mock (can swap for NewsAPI with key)

const CRYPTO_IDS = 'bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,polygon'

const STOCK_DATA = [
  // NSE/BSE
  { sym:'RELIANCE', name:'Reliance Industries', price:2847.50, change:1.24, mkt:'NSE', sector:'Energy' },
  { sym:'TCS',      name:'Tata Consultancy',    price:3921.00, change:-0.38, mkt:'NSE', sector:'IT' },
  { sym:'INFY',     name:'Infosys',             price:1432.60, change:0.92, mkt:'NSE', sector:'IT' },
  { sym:'HDFC',     name:'HDFC Bank',           price:1623.40, change:0.55, mkt:'BSE', sector:'Finance' },
  { sym:'WIPRO',    name:'Wipro Ltd',           price:487.20,  change:-1.12, mkt:'NSE', sector:'IT' },
  { sym:'TATAMOTORS',name:'Tata Motors',        price:921.30,  change:2.34, mkt:'NSE', sector:'Auto' },
  { sym:'BAJFINANCE',name:'Bajaj Finance',      price:6843.00, change:-0.67, mkt:'BSE', sector:'Finance' },
  { sym:'HCLTECH',  name:'HCL Technologies',    price:1398.75, change:1.56, mkt:'NSE', sector:'IT' },
  // NYSE/NASDAQ
  { sym:'AAPL',  name:'Apple Inc',          price:189.30, change:0.82, mkt:'NASDAQ', sector:'Tech' },
  { sym:'MSFT',  name:'Microsoft Corp',     price:415.60, change:1.14, mkt:'NASDAQ', sector:'Tech' },
  { sym:'GOOGL', name:'Alphabet Inc',       price:175.40, change:-0.23, mkt:'NASDAQ', sector:'Tech' },
  { sym:'AMZN',  name:'Amazon.com',         price:186.90, change:1.87, mkt:'NASDAQ', sector:'Retail' },
  { sym:'TSLA',  name:'Tesla Inc',          price:245.80, change:-2.14, mkt:'NASDAQ', sector:'Auto' },
  { sym:'META',  name:'Meta Platforms',     price:524.70, change:0.95, mkt:'NASDAQ', sector:'Tech' },
  { sym:'NVDA',  name:'NVIDIA Corp',        price:875.40, change:3.21, mkt:'NASDAQ', sector:'Tech' },
  { sym:'JPM',   name:'JPMorgan Chase',     price:198.50, change:0.43, mkt:'NYSE',   sector:'Finance' },
]

const NEWS = [
  { title:'RBI holds repo rate at 6.5% amid inflation concerns', time:'2h ago', tag:'India', sentiment:'neutral' },
  { title:'NIFTY 50 crosses 23,000 mark on strong FII inflows', time:'3h ago', tag:'NSE', sentiment:'positive' },
  { title:'Fed signals potential rate cut in Q2 2025', time:'4h ago', tag:'US', sentiment:'positive' },
  { title:'NVIDIA reports record quarterly revenue', time:'5h ago', tag:'Tech', sentiment:'positive' },
  { title:'Crude oil rises 1.2% on Middle East supply fears', time:'6h ago', tag:'Commodities', sentiment:'negative' },
  { title:'Bitcoin crosses $68,000 as ETF inflows surge', time:'7h ago', tag:'Crypto', sentiment:'positive' },
  { title:'Sensex gains 450 points; IT stocks lead rally', time:'8h ago', tag:'BSE', sentiment:'positive' },
  { title:'Dollar index falls as inflation data comes in cooler', time:'10h ago', tag:'Forex', sentiment:'positive' },
]

const CURRENCIES = ['USD','EUR','GBP','JPY','AED','AUD','CAD','CHF','SGD','CNY','HKD','SAR']

function Sparkline({ positive }) {
  const points = Array.from({length:12},(_,i)=>({
    x: i*8,
    y: 20 + (positive ? -1:1)*Math.sin(i*0.8)*8 + (Math.random()-0.5)*6
  }))
  const d = points.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ')
  return (
    <svg width="96" height="40" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={`sg${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive?'#34d399':'#f87171'} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={positive?'#34d399':'#f87171'} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={d+` L88,40 L0,40 Z`} fill={`url(#sg${positive})`}/>
      <path d={d} fill="none" stroke={positive?'#34d399':'#f87171'} strokeWidth="1.5"/>
    </svg>
  )
}

export default function MarketPage() {
  const [tab, setTab]             = useState('stocks')
  const [stocks, setStocks]       = useState(STOCK_DATA)
  const [crypto, setCrypto]       = useState([])
  const [rates, setRates]         = useState({})
  const [fromCur, setFromCur]     = useState('USD')
  const [toCur, setToCur]         = useState('INR')
  const [amount, setAmount]       = useState('1')
  const [converted, setConverted] = useState('')
  const [watchlist, setWatchlist] = useState(['RELIANCE','TCS','AAPL','NVDA'])
  const [mktFilter, setMktFilter] = useState('ALL')
  const [stockSearch, setStockSearch] = useState('')
  const [loading, setLoading]     = useState({ crypto:true, rates:true })
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [alerts, setAlerts]       = useState([])

  // ── Fetch exchange rates ─────────────────────────────────────────────────
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=INR')
      const data = await res.json()
      // data.rates gives: how many X per 1 INR → we want INR per 1 X
      const invertedRates = {}
      invertedRates['INR'] = 1
      Object.entries(data.rates).forEach(([cur, val]) => {
        invertedRates[cur] = 1 / val  // This is wrong direction, let me fix
      })
      // frankfurter: from=INR means 1 INR = X USD → rates.USD = 0.012
      // We want: 1 USD = ? INR → 1/0.012 = 83.3
      setRates(data.rates) // raw: 1 INR = rates[cur]
      setLoading(p=>({...p,rates:false}))
    } catch {
      // Fallback rates (INR base: 1 INR = x foreign)
      setRates({ USD:0.01201, EUR:0.01105, GBP:0.00946, JPY:1.799, AED:0.04412, AUD:0.01843, CAD:0.01635, CHF:0.01078, SGD:0.01620, CNY:0.08681, HKD:0.09382, SAR:0.04504 })
      setLoading(p=>({...p,rates:false}))
    }
  }, [])

  // ── Fetch crypto ─────────────────────────────────────────────────────────
  const fetchCrypto = useCallback(async () => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS}&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h`)
      const data = await res.json()
      setCrypto(data)
      setLoading(p=>({...p,crypto:false}))
    } catch {
      // Fallback crypto data
      setCrypto([
        {id:'bitcoin',name:'Bitcoin',symbol:'BTC',current_price:67840,price_change_percentage_24h:2.34,market_cap:1337000000000,image:'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'},
        {id:'ethereum',name:'Ethereum',symbol:'ETH',current_price:3521,price_change_percentage_24h:-1.12,market_cap:423000000000,image:'https://assets.coingecko.com/coins/images/279/small/ethereum.png'},
        {id:'binancecoin',name:'BNB',symbol:'BNB',current_price:589,price_change_percentage_24h:0.87,market_cap:87000000000,image:'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png'},
        {id:'solana',name:'Solana',symbol:'SOL',current_price:178,price_change_percentage_24h:4.21,market_cap:83000000000,image:'https://assets.coingecko.com/coins/images/4128/small/solana.png'},
        {id:'ripple',name:'XRP',symbol:'XRP',current_price:0.532,price_change_percentage_24h:-0.45,market_cap:29000000000,image:'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png'},
        {id:'dogecoin',name:'Dogecoin',symbol:'DOGE',current_price:0.1621,price_change_percentage_24h:3.45,market_cap:23000000000,image:'https://assets.coingecko.com/coins/images/5/small/dogecoin.png'},
        {id:'cardano',name:'Cardano',symbol:'ADA',current_price:0.458,price_change_percentage_24h:-2.11,market_cap:16000000000,image:'https://assets.coingecko.com/coins/images/975/small/cardano.png'},
        {id:'polygon',name:'Polygon',symbol:'MATIC',current_price:0.892,price_change_percentage_24h:1.67,market_cap:8700000000,image:'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png'},
      ])
      setLoading(p=>({...p,crypto:false}))
    }
  }, [])

  useEffect(() => { fetchRates(); fetchCrypto() }, [])

  // Simulate live stock price updates every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setStocks(prev => prev.map(s => {
        const delta = (Math.random()-0.48) * 0.3
        const newPrice = +(s.price * (1 + delta/100)).toFixed(2)
        const newChange = +(s.change + delta*0.1).toFixed(2)
        // Check alerts
        alerts.forEach(a => {
          if (a.sym === s.sym && Math.abs(newChange) > a.threshold) {
            toast(`🔔 ${s.sym} moved ${newChange > 0 ? '+' : ''}${newChange}%`, { duration: 4000 })
          }
        })
        return { ...s, price: newPrice, change: newChange, _updated: true }
      }))
      setLastUpdated(new Date())
    }, 5000)
    return () => clearInterval(t)
  }, [alerts])

  // Currency converter
  useEffect(() => {
    if (!Object.keys(rates).length || !amount) return
    const amt = parseFloat(amount)
    if (isNaN(amt)) { setConverted(''); return }
    // rates are: 1 INR = rates[X]
    // If from=INR, to=USD: amt * rates.USD
    // If from=USD, to=INR: amt / rates.USD
    // If from=EUR, to=USD: (amt / rates.EUR) * rates.USD
    let inINR = fromCur === 'INR' ? amt : amt / rates[fromCur]
    let result = toCur === 'INR' ? inINR : inINR * rates[toCur]
    setConverted(result.toFixed(4))
  }, [amount, fromCur, toCur, rates])

  const toggleWatch = (sym) => {
    setWatchlist(prev => prev.includes(sym) ? prev.filter(s=>s!==sym) : [...prev,sym])
    toast.success(watchlist.includes(sym) ? `Removed ${sym} from watchlist` : `Added ${sym} to watchlist`)
  }

  const filteredStocks = stocks.filter(s => {
    const matchMkt = mktFilter === 'ALL' || s.mkt === mktFilter
    const matchSearch = !stockSearch || s.sym.toLowerCase().includes(stockSearch.toLowerCase()) || s.name.toLowerCase().includes(stockSearch.toLowerCase())
    return matchMkt && matchSearch
  })

  const topMovers = [...stocks].sort((a,b) => Math.abs(b.change)-Math.abs(a.change)).slice(0,5)
  const watchlistStocks = stocks.filter(s => watchlist.includes(s.sym))

  // INR rates display (how much INR per 1 foreign unit)
  const inrRates = {}
  Object.entries(rates).forEach(([cur,val]) => { inrRates[cur] = (1/val).toFixed(2) })
  inrRates['INR'] = '1.00'

  const FEATURED_CURRENCIES = ['USD','EUR','GBP','JPY','AED','AUD','CAD','CHF']

  return (
    <div style={{maxWidth:1300,margin:'0 auto',padding:'72px 20px 40px',position:'relative',zIndex:1}}>
      <style>{`
        @keyframes priceFlash { 0%{background:rgba(99,102,241,.3)} 100%{background:transparent} }
        .price-flash { animation: priceFlash 1s ease }
        .tab-btn { padding:8px 18px;border:none;cursor:pointer;font-family:Inter;font-size:13px;font-weight:600;border-radius:9px;transition:all .15s; }
        .market-card { background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;transition:all .2s;cursor:pointer; }
        .market-card:hover { background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.3);transform:translateY(-2px); }
      `}</style>

      {/* Header */}
      <div className="au" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,color:'var(--t1)',letterSpacing:'-0.5px',marginBottom:4}}>
            📊 Market Dashboard
          </h1>
          <p style={{fontSize:13,color:'var(--t3)',display:'flex',alignItems:'center',gap:6}}>
            <span className="au" style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block',animation:'pulse 2s infinite'}}/>
            Live data · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={()=>{fetchRates();fetchCrypto();toast.success('Data refreshed!')}} className="btn-ghost" style={{border:'1px solid var(--border)',borderRadius:10,display:'flex',alignItems:'center',gap:6,padding:'8px 14px'}}>
          <FiRefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Top stats bar */}
      <div className="au1" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:'NIFTY 50',value:'23,147.90',change:'+1.24%',pos:true},
          {label:'SENSEX',  value:'76,392.48',change:'+1.18%',pos:true},
          {label:'S&P 500', value:'5,431.50', change:'+0.67%',pos:true},
          {label:'NASDAQ',  value:'17,642.30',change:'+0.89%',pos:true},
          {label:'DOW JONES',value:'39,118.86',change:'-0.12%',pos:false},
        ].map((idx,i)=>(
          <div key={i} className="market-card" style={{textAlign:'center',padding:'14px 10px'}}>
            <p style={{fontSize:11,color:'var(--t3)',fontWeight:600,marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>{idx.label}</p>
            <p style={{fontSize:15,fontWeight:800,color:'var(--t1)',marginBottom:3}}>{idx.value}</p>
            <p style={{fontSize:12,fontWeight:600,color:idx.pos?'#34d399':'#f87171',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
              {idx.pos?<FiTrendingUp size={11}/>:<FiTrendingDown size={11}/>}{idx.change}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="au2" style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {[['stocks','📈 Stocks'],['crypto','₿ Crypto'],['forex','💱 Forex'],['watchlist','⭐ Watchlist'],['news','📰 News']].map(([t,l])=>(
          <button key={t} className="tab-btn" onClick={()=>setTab(t)} style={{background:tab===t?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(255,255,255,.06)',color:tab===t?'#fff':'var(--t2)',boxShadow:tab===t?'0 4px 16px rgba(99,102,241,.3)':'none'}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,alignItems:'start'}}>
        {/* MAIN CONTENT */}
        <div>

          {/* ── STOCKS ── */}
          {tab==='stocks' && (
            <div>
              {/* Filters */}
              <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{position:'relative',flex:1,minWidth:180}}>
                  <FiSearch size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--t3)'}}/>
                  <input placeholder="Search stocks..." value={stockSearch} onChange={e=>setStockSearch(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px 8px 30px',fontSize:13,fontFamily:'Inter',color:'var(--t1)',outline:'none'}}
                    onFocus={e=>e.target.style.borderColor='rgba(99,102,241,.4)'}
                    onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
                {['ALL','NSE','BSE','NYSE','NASDAQ'].map(m=>(
                  <button key={m} onClick={()=>setMktFilter(m)} style={{padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'Inter',fontSize:12,fontWeight:600,background:mktFilter===m?'rgba(99,102,241,.25)':'rgba(255,255,255,.06)',color:mktFilter===m?'#a5b4fc':'var(--t3)',transition:'all .15s'}}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Stock table */}
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 100px 90px 90px 100px 40px',gap:8,padding:'10px 16px',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.5px'}}>
                  <span>Company</span><span style={{textAlign:'right'}}>Price</span><span style={{textAlign:'right'}}>24h</span><span style={{textAlign:'right'}}>Market</span><span style={{textAlign:'right'}}>Trend</span><span/>
                </div>
                {filteredStocks.map((s,i)=>(
                  <div key={s.sym} className="au" style={{animationDelay:`${i*.03}s`,display:'grid',gridTemplateColumns:'1fr 100px 90px 90px 100px 40px',gap:8,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center',transition:'background .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div>
                      <p style={{fontWeight:700,fontSize:13,color:'var(--t1)'}}>{s.sym}</p>
                      <p style={{fontSize:11,color:'var(--t3)'}}>{s.name}</p>
                    </div>
                    <p style={{textAlign:'right',fontWeight:700,fontSize:13,color:'var(--t1)',fontFamily:'DM Mono'}}>
                      {s.mkt==='NSE'||s.mkt==='BSE'?'₹':'$'}{s.price.toLocaleString()}
                    </p>
                    <p style={{textAlign:'right',fontSize:13,fontWeight:600,color:s.change>=0?'#34d399':'#f87171',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:3}}>
                      {s.change>=0?<FiTrendingUp size={12}/>:<FiTrendingDown size={12}/>}
                      {s.change>=0?'+':''}{s.change}%
                    </p>
                    <p style={{textAlign:'right',fontSize:11,color:'var(--t3)'}}>{s.mkt}</p>
                    <div style={{display:'flex',justifyContent:'flex-end'}}><Sparkline positive={s.change>=0}/></div>
                    <button onClick={()=>toggleWatch(s.sym)} style={{background:'none',border:'none',cursor:'pointer',color:watchlist.includes(s.sym)?'#fbbf24':'var(--t4)',padding:4,display:'flex',transition:'color .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.color='#fbbf24'}
                      onMouseLeave={e=>e.currentTarget.style.color=watchlist.includes(s.sym)?'#fbbf24':'var(--t4)'}>
                      <FiStar size={14} style={{fill:watchlist.includes(s.sym)?'#fbbf24':'none'}}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CRYPTO ── */}
          {tab==='crypto' && (
            <div>
              {loading.crypto ? (
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                  {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:80,borderRadius:12}}/>)}
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                  {crypto.map((c,i)=>(
                    <div key={c.id} className="market-card au" style={{animationDelay:`${i*.05}s`,display:'flex',gap:12,alignItems:'center'}}>
                      <img src={c.image} alt={c.symbol} style={{width:42,height:42,borderRadius:'50%'}}/>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <p style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>{c.name}</p>
                            <p style={{fontSize:11,color:'var(--t3)',textTransform:'uppercase'}}>{c.symbol}</p>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <p style={{fontWeight:700,fontSize:14,color:'var(--t1)',fontFamily:'DM Mono'}}>${c.current_price?.toLocaleString()}</p>
                            <p style={{fontSize:12,fontWeight:600,color:c.price_change_percentage_24h>=0?'#34d399':'#f87171',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:3}}>
                              {c.price_change_percentage_24h>=0?<FiTrendingUp size={11}/>:<FiTrendingDown size={11}/>}
                              {c.price_change_percentage_24h?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        <p style={{fontSize:11,color:'var(--t3)',marginTop:4}}>Mkt Cap: ${(c.market_cap/1e9).toFixed(1)}B</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FOREX ── */}
          {tab==='forex' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Converter */}
              <div className="card" style={{padding:24}}>
                <h3 style={{fontWeight:700,fontSize:16,color:'var(--t1)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}><FiDollarSign size={16}/> Currency Converter</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'end',marginBottom:16}}>
                  <div>
                    <label style={{display:'block',fontSize:11,color:'var(--t3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>From</label>
                    <div style={{display:'flex',gap:8}}>
                      <select value={fromCur} onChange={e=>setFromCur(e.target.value)} style={{background:'rgba(255,255,255,.07)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',color:'var(--t1)',fontFamily:'Inter',fontSize:14,outline:'none',flex:'0 0 90px'}}>
                        <option value="INR">INR ₹</option>
                        {CURRENCIES.filter(c=>c!=='INR').map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="input" style={{flex:1,fontFamily:'DM Mono',fontSize:16,fontWeight:700}} placeholder="Amount"/>
                    </div>
                  </div>
                  <div style={{padding:'0 8px 10px',fontSize:22,color:'var(--t3)',cursor:'pointer'}} onClick={()=>{const t=fromCur;setFromCur(toCur);setToCur(t)}}>⇄</div>
                  <div>
                    <label style={{display:'block',fontSize:11,color:'var(--t3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>To</label>
                    <div style={{display:'flex',gap:8}}>
                      <select value={toCur} onChange={e=>setToCur(e.target.value)} style={{background:'rgba(255,255,255,.07)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',color:'var(--t1)',fontFamily:'Inter',fontSize:14,outline:'none',flex:'0 0 90px'}}>
                        <option value="INR">INR ₹</option>
                        {CURRENCIES.filter(c=>c!=='INR').map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <div style={{flex:1,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center'}}>
                        <span style={{fontFamily:'DM Mono',fontSize:18,fontWeight:800,color:'#a5b4fc'}}>{converted || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {converted && <div style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:10,padding:'10px 16px',fontSize:13,color:'var(--t2)',textAlign:'center'}}>
                  <strong style={{color:'var(--t1)'}}>{parseFloat(amount).toLocaleString()} {fromCur}</strong> = <strong style={{color:'#a5b4fc'}}>{parseFloat(converted).toLocaleString()} {toCur}</strong>
                  <span style={{color:'var(--t3)',marginLeft:8,fontSize:11}}>· via frankfurter.app</span>
                </div>}
              </div>

              {/* INR rates grid */}
              <div className="card" style={{padding:20}}>
                <h3 style={{fontWeight:700,fontSize:15,color:'var(--t1)',marginBottom:14}}>₹ INR Exchange Rates</h3>
                {loading.rates ? (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    {[1,2,3,4,5,6,7,8].map(i=><div key={i} className="skeleton" style={{height:60,borderRadius:8}}/>)}
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    {FEATURED_CURRENCIES.map(cur=>(
                      <div key={cur} className="market-card" style={{padding:'12px',textAlign:'center'}}>
                        <p style={{fontSize:11,color:'var(--t3)',fontWeight:600,textTransform:'uppercase',marginBottom:4,letterSpacing:'.5px'}}>{cur}</p>
                        <p style={{fontSize:16,fontWeight:800,color:'var(--t1)',fontFamily:'DM Mono'}}>₹{inrRates[cur]||'—'}</p>
                        <p style={{fontSize:10,color:'var(--t3)',marginTop:2}}>per 1 {cur}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WATCHLIST ── */}
          {tab==='watchlist' && (
            <div>
              {watchlistStocks.length===0 ? (
                <div className="card" style={{padding:'52px 24px',textAlign:'center'}}>
                  <FiStar size={36} style={{color:'var(--t3)',marginBottom:12}}/>
                  <p style={{fontWeight:600,color:'var(--t2)',marginBottom:4}}>Your watchlist is empty</p>
                  <p style={{fontSize:13,color:'var(--t3)'}}>Click ⭐ on any stock to add it here</p>
                </div>
              ) : (
                <div className="card" style={{overflow:'hidden'}}>
                  <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:600,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.5px',display:'flex',justifyContent:'space-between'}}>
                    <span>Watching {watchlistStocks.length} stocks</span>
                    <span>Live prices · updates every 5s</span>
                  </div>
                  {watchlistStocks.map((s,i)=>(
                    <div key={s.sym} className="au" style={{animationDelay:`${i*.05}s`,display:'flex',gap:12,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center',transition:'background .12s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>{s.sym}</p>
                        <p style={{fontSize:12,color:'var(--t3)'}}>{s.name} · {s.mkt} · {s.sector}</p>
                      </div>
                      <Sparkline positive={s.change>=0}/>
                      <div style={{textAlign:'right',minWidth:80}}>
                        <p style={{fontWeight:800,fontSize:14,fontFamily:'DM Mono',color:'var(--t1)'}}>{s.mkt==='NSE'||s.mkt==='BSE'?'₹':'$'}{s.price.toLocaleString()}</p>
                        <p style={{fontSize:12,fontWeight:600,color:s.change>=0?'#34d399':'#f87171'}}>{s.change>=0?'+':''}{s.change}%</p>
                      </div>
                      <button onClick={()=>toggleWatch(s.sym)} style={{background:'none',border:'none',cursor:'pointer',color:'#fbbf24',padding:4}}>
                        <FiStar size={15} style={{fill:'#fbbf24'}}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NEWS ── */}
          {tab==='news' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {NEWS.map((n,i)=>(
                <div key={i} className="card card-hover au" style={{animationDelay:`${i*.04}s`,padding:'14px 18px',display:'flex',gap:14,alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:n.sentiment==='positive'?'#34d399':n.sentiment==='negative'?'#f87171':'#fbbf24',marginTop:6,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <p style={{fontSize:14,fontWeight:500,color:'var(--t1)',lineHeight:1.5,marginBottom:6}}>{n.title}</p>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <span style={{fontSize:11,background:'rgba(99,102,241,.15)',color:'#a5b4fc',padding:'2px 8px',borderRadius:999,fontWeight:600}}>{n.tag}</span>
                      <span style={{fontSize:11,color:'var(--t3)'}}>{n.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside style={{display:'flex',flexDirection:'column',gap:12,position:'sticky',top:72}}>
          {/* Top Movers */}
          <div className="card" style={{padding:'14px 0'}}>
            <h3 style={{fontWeight:700,fontSize:14,color:'var(--t1)',padding:'0 16px 10px',display:'flex',alignItems:'center',gap:6}}><FiBarChart2 size={14}/> Top Movers</h3>
            {topMovers.map((s,i)=>(
              <div key={s.sym} className="au" style={{animationDelay:`${i*.05}s`,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 16px',cursor:'pointer',transition:'background .12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div>
                  <p style={{fontWeight:700,fontSize:13,color:'var(--t1)'}}>{s.sym}</p>
                  <p style={{fontSize:11,color:'var(--t3)'}}>{s.mkt}</p>
                </div>
                <p style={{fontSize:13,fontWeight:700,color:s.change>=0?'#34d399':'#f87171',display:'flex',alignItems:'center',gap:3}}>
                  {s.change>=0?<FiTrendingUp size={12}/>:<FiTrendingDown size={12}/>}
                  {s.change>=0?'+':''}{s.change}%
                </p>
              </div>
            ))}
          </div>

          {/* Quick FX */}
          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontWeight:700,fontSize:14,color:'var(--t1)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><FiGlobe size={14}/> Quick FX</h3>
            {loading.rates ? <div className="skeleton" style={{height:120,borderRadius:8}}/> :
              ['USD','EUR','GBP','AED'].map(cur=>(
                <div key={cur} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                  <span style={{fontSize:13,color:'var(--t2)',fontWeight:600}}>{cur}/INR</span>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--t1)',fontFamily:'DM Mono'}}>₹{inrRates[cur]||'—'}</span>
                </div>
              ))
            }
          </div>

          {/* Alerts setup */}
          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontWeight:700,fontSize:14,color:'var(--t1)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><FiBell size={14}/> Price Alerts</h3>
            <p style={{fontSize:12,color:'var(--t3)',marginBottom:10}}>Get notified when stocks move significantly</p>
            <button onClick={()=>{
              const sym = prompt('Stock symbol (e.g. RELIANCE, AAPL):')?.toUpperCase()
              const threshold = parseFloat(prompt('Alert when change exceeds % (e.g. 2):'))
              if (sym && !isNaN(threshold)) {
                setAlerts(prev=>[...prev,{sym,threshold}])
                toast.success(`Alert set: ${sym} > ${threshold}%`)
              }
            }} className="btn-primary" style={{width:'100%',fontSize:12,padding:'8px'}}>
              + Set Alert
            </button>
            {alerts.length>0 && (
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,padding:'6px 8px',background:'rgba(255,255,255,.05)',borderRadius:6}}>
                    <span style={{color:'var(--t1)',fontWeight:600}}>{a.sym} &gt; {a.threshold}%</span>
                    <button onClick={()=>setAlerts(prev=>prev.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#f87171',fontSize:14}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Market status */}
          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontWeight:700,fontSize:14,color:'var(--t1)',marginBottom:10}}>Market Status</h3>
            {[
              {name:'NSE/BSE',hours:'9:15–15:30 IST',open:true},
              {name:'NYSE/NASDAQ',hours:'9:30–16:00 EST',open:false},
              {name:'Crypto',hours:'24/7',open:true},
              {name:'Forex',hours:'24/5',open:true},
            ].map(m=>(
              <div key={m.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:'var(--t1)'}}>{m.name}</p>
                  <p style={{fontSize:10,color:'var(--t3)'}}>{m.hours}</p>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:999,background:m.open?'rgba(52,211,153,.15)':'rgba(248,113,113,.15)',color:m.open?'#34d399':'#f87171'}}>{m.open?'OPEN':'CLOSED'}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
