const DelayTime = 0.005 // 1 ms

const DefaultBasket = { x: 26.3, y: 74.5 }

const DefaultProduct = { x: 38.125, y: 66.7 }

const FirstRowSlotList = [
    { x: 36.6, y: 90.7 }, //0
    // { x: 37, y: 90.7 },
    // { x: 37.2, y: 90.7 }, 
    { x: 46.4, y: 90.7 }, //1
    // { x: 46.8, y: 90.7 }, 
    { x: 55.6, y: 90.7 }, //2
    // { x: 56, y: 90.7 },  
    { x: 63.6, y: 90.7 }, //3
    // { x: 64, y: 90.7 },
    { x: 73.4, y: 90.7 }, //4
    // { x: 73.8, y: 90.7 }, 
    { x: 81.6, y: 90.7 },  //5
    // { x: 82, y: 90.7 },  
    // { x: 84.0, y: 90.7},
]

const SecondRowSlotList = [
    { x: 36.6, y: 65.0 },
    // { x: 37, y: 65.0 },
    { x: 46.4, y: 65.0 },
    // { x: 46.8, y: 65.0 },
    { x: 55.6, y: 65.0 },
    // { x: 56, y: 65.0 },
    { x: 63.6, y: 65.0 },
    // { x: 64, y: 65.0 },
    { x: 72.7, y: 65.0 },
    // { x: 73.1, y: 65.0 },
    { x: 81.6, y: 65.0 },
    // { x: 82, y: 65.0 },
    // { x: 84.0, y: 90.7},

]

const ThirdRowSlotList = [
    { x: 36.6, y: 37.1 },
    // { x: 37, y: 37.1 },
    { x: 46.4, y: 39.4 },
    // { x: 46.8, y: 39.4 },
    { x: 55.6, y: 37.1 },
    // { x: 56, y: 37.1 },
    { x: 63.6, y: 37.1 },
    // { x: 64, y: 37.1 },
    { x: 72.7, y: 38.1 },
    // { x: 73.1, y: 38.1 },
    { x: 81.6, y: 37.1 },
    // { x: 82, y: 37.1 },
    { x: 84.0, y: 37.1},
]

const FourthRowSlotList = [
    { x: 36.6, y: 13.0 }, //0
    // { x: 37, y: 13.0 },
    // { x: 37.2, y: 13.0 }, 
    { x: 46.4, y: 13.0 }, //1
    // { x: 46.8, y: 13.0 }, 
    { x: 55.6, y: 13.0 }, //2
    // { x: 56, y: 13.0 },  
    { x: 63.6, y: 13.0 }, //3
    // { x: 64, y: 13.0 },
    { x: 73.4, y: 13.0 }, //4
    // { x: 73.8, y: 13.0 }, 
    { x: 81.6, y: 13.0 },  //5
    // { x: 82, y: 13.0 },  
    // { x: 84.0, y: 13.0},
]
const PlantSlotList = [
    //[0, 1, 2]
    //[3, 4]
    { x: 16.22, y: 77.8 },
    { x: 25.2, y: 77.8 },
    { x: 33.8, y: 77.8 },
    { x: 16.8, y: 86.7 },
    { x: 25.0, y: 86.7 },
]

const MakeSlotList = [
    //[0, 1, 2]
    //   [3, 4]
    { x: 45.62, y: 52.6 },
    { x: 53.12, y: 52.6},
    { x: 60.62, y: 52.6 },
    { x: 53.12, y: 60.4},
    { x: 60.62, y: 60.4 },
]

const SellItemOptions = {
    tree: 0,
    goods: 1,
    other: 2,
    mineral: 3,
    events: 4,
}

const SellOptions = [
    { x: 53.75, y: 34.1 }, // Trees
    { x: 53.75, y: 42.3 }, // Goods
    { x: 53.75, y: 52.0 }, // Others
    { x: 53.75, y: 60.0}, // Mineral
    { x: 53.75, y: 70.3 }, // Events
]

const SellSlotList = [
    // [0, 1, 2, 3]
    // [4, 5, 6, 7]
    { x: 25.0, y: 41.7},
    { x: 41.25, y: 41.7 },
    { x: 57.5, y: 41.7 },
    { x: 73.75, y: 41.7 },
    { x: 25.0, y: 65.0 },
    { x: 41.25, y: 65.0},
    { x: 57.5, y: 65.0 },
    { x: 73.75, y: 65.0 },
    // { x : 84.5 , y: 44.6},
    // { x : 84.5 , y: 65.0},
]

const FriendHouseList = [
    { x: 7.5, y: 79.3 },
    { x: 22.5, y: 79.3 },
    { x: 37.5, y: 79.3 },
    { x: 52.5, y: 79.3 },
    { x: 67.5, y: 79.3 },
]

const ItemKeys = {
    nextOption: 'next-option',
    emptyProductionSlot: 'o-trong-san-xuat',
    emptySellSlot: 'o-trong-ban',
    soldSlot: 'o-da-ban',
    harvestBasket: 'thu-hoach',
    chest: 'ruong-bau',
    chest1: 'ruong-bau1',
    game: 'game',
    game1 : 'game1',
    gameId: 'vn.kvtm.js',
    shopGem: 'shop-gem',
    goDownLast: 'xuong-day',
    friendHouse: 'friend-house',
    myHouse: 'my-house',
    livestockEvents: 'livestock-events',
    dangnhap : 'dang-nhap',
    kc : 'kc',
    fullkho : 'full-kho',
    chuaqc : 'chua-qc',
    votxanh :'vot-xanh',
    xoavp : 'xoa-vp',
    dongy : 'dongy',
    chuachon :'chua-chon',
    
}

const TreeKeys = {
    tao: 'tao',
    hong: 'hong',
    chanh: 'chanh',
    tuyet: 'tuyet',
    bong: 'bong',
    oaiHuong: 'oai-huong',
    dua: 'dua',
    duaHau: 'dua-hau',
    caysao : 'su-kien'
}

const BugKeys = {
    ong : 'ong-vang',
    buom : 'buom-hong',
    chuonchuon : 'chuon-chuon',
}

const ProductKeys = {
    hatDuaSay: 'hat-dua-say',
    vaiTim: 'vai-tim',
    vaiDo: 'vai-do',
    vaiVang: 'vai-vang',
    nuocChanh: 'nuoc-chanh',
    nuocTuyet: 'nuoc-tuyet',
    tinhDauChanh: 'tinh-dau-chanh',
    tinhDauDua: 'tinh-dau-dua',
    tinhDauHoaHong: 'tinh-dau-hoa-hong',
    traHoaHong: 'tra-hoa-hong',
    nuocHoaHuongTao: 'nuoc-hoa-huong-tao',
    vaiXanhLa: 'vai-xanh-la',
    nuocHoaHoaHong : 'nuoc-hoa-hoa-hong',
    nuoctao : 'nuoc-tao',
    duaHau : 'p-dua-hau',
    
}

const EventKeys = {
    bo: 'event-bo',
    ga: 'event-ga',
    cuu: 'event-cuu',
    heo: 'event-heo',
    kem: 'event-kem',
    dua: 'event-dua',
    kinh: 'event-kinh',
}

const AchievementKeys = {
    GapNhauMoiNgay: 'gap-nhau-moi-ngay',
}

const SlotPositions = {
    p1: '1',
    p2: '2',
    p3: '3',
    p4: '4',
    p1p2: '12',
    p1p3: '13',
    p2p4: '24',
    p3p4: '34',
    caytrong:'caytrong',
    thuhoach: 'thuhoach',
    bando: 'bando',
    moruong : 'moruong',
    fullkho : 'fullkho',
    kc : 'kc',
    cam : 'cam',
    quayhang : 'quayhang',
    batbo : 'batbo',

}

module.exports = {
    DelayTime,
    DefaultBasket,
    DefaultProduct,
    FirstRowSlotList,
    SecondRowSlotList,
    ThirdRowSlotList,
    FourthRowSlotList,
    SellOptions,
    PlantSlotList,
    MakeSlotList,
    SellItemOptions,
    SellSlotList,
    ItemKeys,
    ProductKeys,
    TreeKeys,
    EventKeys,
    AchievementKeys,
    FriendHouseList,
    SlotPositions,
    BugKeys,

}
