import type { ImportMeta } from '../domain/links'

const telegramPosts = `
https://t.me/mad_apes_gambles/8515
https://t.me/mad_apes_call/7810
https://t.me/EasysDegens/1909
https://t.me/ZLaunchBotOfficial/4225
https://t.me/Marshmellow100xCalls/1666
https://t.me/johnwickmemesafari/9030
https://t.me/KingDawgsDegenCalls/2686
https://t.me/KobesCalls/3651
https://t.me/ethsafesniper/2312
https://t.me/mackcalls/5711
https://t.me/DoxxedChannel/8216
https://t.me/gubbinscalls/6233
https://t.me/HellsingCalls/5039
https://t.me/stoogiescallcenter/778
https://t.me/kobesgambles/1493
https://t.me/eyecrosschain/2039
https://t.me/mad_apes_gambles/8498
https://t.me/mad_apes_gambles/8497
https://t.me/mackcalls/5686
https://t.me/getruggedwithroland/1173
https://t.me/mad_apes_gambles/8465
https://t.me/RiskyGemsHuntersCalls/8739
https://t.me/AlphaCallzz/41973
https://t.me/BRENTLYSROYALS/3382
https://t.me/cryptogems555/65365
https://t.me/queizplayz/3673
https://t.me/mad_apes_call/7802
https://t.me/lowtaxethx/9456
https://t.me/HarleyQuinngamble/6559
https://t.me/BasedLaunches/5227
https://t.me/lowtaxethx/9462
https://t.me/hiddengem10000x/1665
https://t.me/Joe420Calls/8750
https://t.me/mad_apes_gambles/8489
https://t.me/CharlesCalls/7668
https://t.me/GodsDegenReviews/2122
https://t.me/AlphaCallzz/42028
https://t.me/BRENTLYSROYALS/3388
https://t.me/moodyalphaapes/2161
https://t.me/mad_apes_gambles/8477
https://t.me/lowtaxethx/9448
https://t.me/NdranghetaETHGems/2748
https://t.me/bunnygambles/1005
https://t.me/AlphaCallzz/41999
https://t.me/SapphireCalls/6706
https://t.me/badrcallz/2110
https://t.me/lowtaxethx/9439
https://t.me/HellsingCalls/5032
https://t.me/mad_apes_gambles/8466
https://t.me/DreamCalls100x/6967
https://t.me/saphircalls/978
https://t.me/mad_apes_gambles/8463
https://t.me/mad_apes_call/7794
https://t.me/LionCALL/5082
https://t.me/mad_apes_call/7791
https://t.me/getruggedwithroland/1178
https://t.me/NdranghetaETHGems/2743
https://t.me/mad_apes_gambles/8459
https://t.me/lowtaxethx/9425
https://t.me/SmineimRiskyGambles/588
https://t.me/whalevomitcalls/7113
https://t.me/mad_apes_gambles/8454
https://t.me/PredatorCalls/1554
https://t.me/gubbinscalls/6231
https://t.me/LionCALL/5081
https://t.me/mad_apes_gambles/8452
https://t.me/DoxxedChannel/8210
https://t.me/PredatorCalls/1547
https://t.me/AlphaCallzz/41989
https://t.me/AlphaCallzz/41987
https://t.me/BRENTLYSROYALS/3377
https://t.me/cryptogems555/65349
https://t.me/InApeWeTrust/4357
https://t.me/johnwickmemesafari/9025
https://t.me/StealthLaunchGambles/945
https://t.me/DoxxedChannel/8205
https://t.me/PowsGemCalls/20219
https://t.me/CharlesCalls/7629
https://t.me/kiritomoonshots/2586
https://t.me/RiskyGemsHuntersCalls/8713
https://t.me/CharlesCalls/7627
https://t.me/lowtaxethx/9381
https://t.me/AlphaCallzz/41886
https://t.me/moodyalphaapes/2158
https://t.me/kobesgambles/1473
https://t.me/CharlesCalls/7623
https://t.me/mad_apes_call/7780
`

const xAccounts = `
https://twitter.com/Traderxiaoxia
https://twitter.com/Yiyixmb
https://twitter.com/dashutiaozi
https://twitter.com/sunyuchentron
https://twitter.com/jasmy_BNB
https://twitter.com/halehuage
https://twitter.com/magnoli95821980
https://twitter.com/CryptosLaowai
https://twitter.com/coin_snake0
https://twitter.com/web3Daoge
https://twitter.com/BTC521
https://twitter.com/ethereum_yyds
https://twitter.com/smqclaske
https://twitter.com/NoodleofBinance
https://twitter.com/Rewkang
https://twitter.com/mx24343
https://twitter.com/0xDanielWeb3
https://twitter.com/Gavin_Alphas
https://twitter.com/0xKillTheWolf
https://twitter.com/Ice_Frog666666
https://twitter.com/BroLeonAus
https://twitter.com/ylm5573
https://twitter.com/laofeiyyds
https://twitter.com/billtheinvestor
https://twitter.com/liangfenxiaodao
https://twitter.com/lianjinshusuoha
https://twitter.com/V1JeromeLoo
https://twitter.com/bitfool1
https://twitter.com/11dizhu
https://twitter.com/Banzhuanclub
https://twitter.com/ChandlerGuo
https://twitter.com/mrblocktw
https://twitter.com/hellosuoha
https://twitter.com/bitfish1
https://twitter.com/theCzoven
https://twitter.com/0xMomentumFi
https://twitter.com/gold_grinder
https://twitter.com/vitalikkitchen
https://twitter.com/animalfarmdefi
https://twitter.com/arkfiinvest
https://twitter.com/LiberaFinancial
https://twitter.com/thoreumfinance
https://twitter.com/beanquestrpg
https://twitter.com/speakeasyltd
https://twitter.com/Wolf_Capital_
https://twitter.com/ArbiFarm_Crypto
https://twitter.com/LlamiFi
https://twitter.com/PolyWantsAFarm
https://twitter.com/grenadinefi
`

const telegramBots = `
https://t.me/CallAnalyser2
https://t.me/dexscreener_trendings
https://t.me/CallAnalyser
https://t.me/mad_apes
https://t.me/trendingsevents
https://t.me/trendingssol
https://t.me/trending
https://t.me/SOLTRENDING
https://t.me/early_calls
https://t.me/pump_trending
https://t.me/BSCTrendingOfficial
https://t.me/DSTrendingBSC
https://t.me/bsctrendingntm
https://t.me/multichaintrending
https://t.me/BASETRENDINGLIVE
https://t.me/iTokenEthereum
https://t.me/etherscan_tracker
https://t.me/TrendingOnSolana
https://t.me/solananewpools
https://t.me/BuyBotTracker
https://t.me/spydefi
https://t.me/MAZITONTRENDING
https://t.me/TonINU_Trending
https://t.me/CRYPTO_RAVEN_CALL
https://x.com/RavenXPump
https://t.me/WizardScan
https://t.me/coinbandagency
https://t.me/CryptoIndustry_GemsCalls
https://t.me/Crypto_TVOT
`

const announcementHandles = `
@CryptoTVOT_News
@CryptoSpaceX04
@CryptoCanvasAnnouncement
@CryptoMonsterClashAnn
@GemstoneLabs_News
@Crypto_FinderNews
@Crypto_InfinityNews
@StrikeLabsNews
@CryptoWorldClub_News
@CryptoKingAnn
@GolfBlockchain_News
@CryptoBooster_News
@Cryptoelephant_News
@CoinLabVerseNews
@MetaBlockchainNews
@SunriseVenturesAnn
@CryptoOrbit_News
@AlphaVaultNews
@CryptoXpressAnnouncement1
@Bsccrypto_News
@CryptoFi_news
@CryptoArenaOfficialAnn
@CTPAlerts
@Crypto_Planet_GlobalChannel
@Cryptorushnetworknews
@Coinwavenews
@Cryptodolphin_ann
@CapitalVenturesAnn
@Crypto_VaultNews
@CRYPTO_ANALYSIS_NEWS_1
@Crypto_Nexus_Announcement
@CryptoBriskNews
@GemsChatNews
@WhaleBlockChainNews
@ChainbaseNews
@AlphaStarNetworks
@CoinHunterAnnuncement
@CryptoHunters_News
@Evolution_Announcement
@CryptoIndustry_GemsCalls
`

const laterTelegram = `
https://t.me/CRYPTO_RAVEN_CALL
https://t.me/CRYPTO_RAVEN_CALL
https://t.me/WizardScan
https://t.me/coinbandagency
https://t.me/CryptoIndustry_GemsCalls
https://t.me/Crypto_TVOT
https://t.me/Coincommander001
# Private Telegram invite links are not stored in this repository. Paste them in the link library; they stay in that workspace only.
https://t.me/cryptovictoriayt
https://t.me/pandacallslonge3
https://t.me/CryptoSpaceX04
https://t.me/CryptoKingAnn
https://t.me/DeFeMillion
@CaoShucheng
@CHINAGEMOFCCCN
@Crypto_Planet_GlobalChannel
@CryptoWorldClub_News
@CryptoTVOT_News
@CryptoKingAnn
@Crypto_InfinityNews
@MetaBlockchainNews
@CryptoBriskNews
@CoinLabVerseNews
@SunriseVenturesAnn
@MetaWhaleNews
@cryptoastronautnews
@CryptoArenaOfficialAnn
@CryptoMonsterClashAnn
@Cryptoelephant_News
`

const laterX = `
https://x.com/RavenXPump
https://x.com/xiaomutoushequ
https://x.com/cryptovictoria_?s=09
https://x.com/CryptomoonTW/
https://twitter.com/CryptoAs_TW
https://twitter.com/CryptoSolutionG
https://x.com/Cryptoelephanta
http://x.com/CryptoArena_Co
https://x.com/MetawhaleGL
http://x.com/sunrise_venture
http://x.com/CoinLabVerse
https://x.com/CryptoInfinityX
https://x.com/CRYPTO_WORLD_CB
https://x.com/CryptoFi_global
http://x.com/CryptoPanda_gl
http://x.com/titaniumtalks1
http://x.com/CryptoFolex0
https://x.com/thenexus_team
https://x.com/squadx_yz
http://x.com/iWizardCrypto
https://x.com/TheCryptooGuru
https://x.com/Defi_Baron14
https://x.com/Defiqueen01
https://x.com/irumkhan01
`

const youtube = `
https://www.youtube.com/@THECOINCOMMANDER
https://youtube.com/@cryptovictoriayt?si=gSJy7Uwl0Fctl48Z
https://youtube.com/@CryptoCapitalVenture/videos
https://youtube.com/@cryptouniverse1000?si=GrL-rToXn3qa7Uzq
`

const listings = `
https://top100token.com
https://coinboom.net
https://solhunters.com
http://cryptototem.com
https://coinsniper.net
https://moontok.io
https://coinhunt.cc
https://coinalpha.app
https://coinmoonhunt.com
`

const profiles = `
https://coinmarketcap.com/community/profile/MoonshotNews
https://www.binance.com/square/profile/elonmusk_tesla
`

const referenceNote = 'Unverified research/reference. A public URL is not permission to post, mention, join, or message.'

export const seedBatches: (ImportMeta & { lines: string })[] = [
  {
    batch: 'Telegram post references',
    category: 'research',
    tags: ['telegram', 'post-reference'],
    notes: `${referenceNote} A Telegram post URL does not grant permission to post in that chat.`,
    lines: telegramPosts,
  },
  {
    batch: 'X profile references',
    category: 'research',
    tags: ['x', 'profile-reference'],
    notes: referenceNote,
    lines: xAccounts,
  },
  {
    batch: 'Telegram bots and trending references',
    category: 'research',
    tags: ['telegram', 'bot-or-trending'],
    notes: referenceNote,
    lines: telegramBots,
  },
  {
    batch: 'Telegram announcement references',
    category: 'research',
    tags: ['telegram', 'announcement-reference'],
    notes: referenceNote,
    lines: announcementHandles,
  },
  {
    batch: 'Later Telegram references',
    category: 'research',
    tags: ['telegram', 'reference'],
    notes: referenceNote,
    lines: laterTelegram,
  },
  {
    batch: 'Later X references',
    category: 'research',
    tags: ['x', 'profile-reference'],
    notes: referenceNote,
    lines: laterX,
  },
  {
    batch: 'YouTube references',
    category: 'research',
    tags: ['youtube', 'video-reference'],
    notes: referenceNote,
    lines: youtube,
  },
  {
    batch: 'Discovery and listing prospects',
    category: 'prospect',
    tags: ['discovery-listing', 'prospect'],
    notes: 'A directory or listing page is not free, available, endorsed, or authorized. Paid placement needs owner review, an explicit budget, and a sponsorship disclosure.',
    lines: listings,
  },
  {
    batch: 'Public profile prospects',
    category: 'prospect',
    tags: ['public-profile', 'prospect'],
    notes: 'Public profile stored as a prospect/reference. It is not an owned account and not a publishing target.',
    lines: profiles,
  },
]
