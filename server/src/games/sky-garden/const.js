const DelayTime = 0.005 // 1 ms

const DefaultBasket = { x: 32.3, y: 80.5 }

const DefaultProduct = { x: 40.5, y: 72.5 }

const FirstRowSlotList = [
    { x: 39.0, y: 94.8 }, //0
    // { x: 37, y: 90.7 },
    // { x: 37.2, y: 90.7 }, 
    { x: 46.5, y: 94.8 }, //1
    // { x: 46.8, y: 90.7 }, 
    { x: 55.6, y: 94.8 }, //2
    // { x: 56, y: 90.7 },  
    { x: 61.6, y: 94.8 }, //3
    // { x: 64, y: 90.7 },
    { x: 69.4, y: 94.8 }, //4
    // { x: 73.8, y: 90.7 }, 
    { x: 76.6, y: 94.8 },  //5
    // { x: 82, y: 90.7 },  
    // { x: 84.0, y: 90.7},
]

const SecondRowSlotList = [
    { x: 39.0, y: 72.0 },
    // { x: 37, y: 65.0 },
    { x: 46.5, y: 72.0 },
    // { x: 46.8, y: 65.0 },
    { x: 55.6, y: 72.0 },
    // { x: 56, y: 65.0 },
    { x: 61.6, y: 72.0 },
    // { x: 64, y: 65.0 },
    { x: 69.4, y: 72.0 },
    // { x: 73.1, y: 65.0 },
    { x: 76.6, y: 72.0 },
    // { x: 82, y: 65.0 },
    // { x: 84.0, y: 90.7},

]

const ThirdRowSlotList = [
    { x: 39.0, y: 50.1 },
    // { x: 37, y: 37.1 },
    { x: 46.5, y: 50.1 },
    // { x: 46.8, y: 39.4 },
    { x: 55.6, y: 50.1 },
    // { x: 56, y: 37.1 },
    { x: 61.6, y: 50.1 },
    // { x: 64, y: 37.1 },
    { x: 69.4, y: 50.1 },
    // { x: 73.1, y: 38.1 },
    { x: 76.6, y: 50.1 },
    // { x: 82, y: 37.1 },
]

const FourthRowSlotList = [
    { x: 39.0, y: 28.7 }, //0
    // { x: 37, y: 13.0 },
    // { x: 37.2, y: 13.0 }, 
    { x: 46.5, y: 28.7 }, //1
    // { x: 46.8, y: 13.0 }, 
    { x: 55.6, y: 28.7 }, //2
    // { x: 56, y: 13.0 },  
    { x: 61.6, y: 28.7 }, //3
    // { x: 64, y: 13.0 },
    { x: 69.4, y: 28.7 }, //4
    // { x: 73.8, y: 13.0 }, 
    { x: 76.6, y: 28.7 },  //5
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
    { x: 45.6, y: 60.3 },
    { x: 52.1, y: 60.3 },
    { x: 58.6, y: 60.3 },
    { x: 52.1, y: 66.8 },
    { x: 58.6, y: 66.8 },
]

const SellItemOptions = {
    tree: 0,
    goods: 1,
    other: 2,
    mineral: 3,
    events: 4,
}

const SellOptions = [
    { x: 45.2, y: 37.6 }, // Trees
    { x: 45.2, y: 44.3 }, // Goods
    { x: 45.2, y: 52.0 }, // Others
    { x: 45.2, y: 60.0 }, // Mineral
    { x: 45.2, y: 66.3 }, // Events
]

const SellSlotList = [
    // [0, 1, 2, 3]
    // [4, 5, 6, 7]
    { x: 30.0, y: 43.5 },
    { x: 41.25, y: 43.5 },
    { x: 57.5, y: 43.5 },
    { x: 69.5, y: 43.5 },
    { x: 30.0, y: 62.0 },
    { x: 41.25, y: 62.0 },
    { x: 57.5, y: 62.0 },
    { x: 69.5, y: 62.0 },
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
    game1: 'game1',
    gameId: 'vn.kvtm.js',
    shopGem: 'shop-gem',
    goDownLast: 'xuong-day',
    friendHouse: 'friend-house',
    myHouse: 'my-house',
    livestockEvents: 'livestock-events',
    dangnhap: 'dang-nhap',
    kc: 'kc',
    fullkho: 'full-kho',
    chuaqc: 'chua-qc',
    tuyet: 'cay-tuyet',
    bong: 'cay-bong',
    oaiHuong: 'cay-oai-huong',
    dua: 'cay-dua',
    duaHau: 'cay-dua-hau',
    caysao: 'cay-su-kien',
    nho: 'cay-nho',
    lai: 'cay-lai',
    sen: 'cay-sen',
    mit: 'cay-mit',
    cuc: 'cay-cuc',
    vietquat: 'cay-viet-quat',
    huongduong: 'cay-huong-duong',
    tra: 'cay-tra',
    bi: 'cay-bi',
    dau: 'cay-dau',
    duas: 'cay-duas',

}

const BugKeys = {
    ong: 'ong-vang',
    buom: 'buom-hong',
    chuonchuon: 'chuon-chuon',
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
    nuocHoaHoaHong: 'nuoc-hoa-hoa-hong',
    nuoctao: 'nuoc-tao',
    duaHau: 'p-dua-hau',
    mitsay: 'mit-say',
    trasay: 'tra-say',
    duasay: 'dua-say',
    oaihuongsay: 'oai-huong-say',
    nuocduahau: 'nuoc-dua-hau',
    nuocdua: 'nuoc-dua',
    taosay: 'tao-say',
    nuocmit: 'nuoc-mit',
    hongsay: 'hong-say',

    'mit-say': 'mit-say',
}

const ProductTreeKeys = {
    dua: 'p-dua',
    chanh: 'p-chanh',
    tuyet: 'p-tuyet',
    tao: 'p-tao',
    hong: 'p-hong',
    oaiHuong: 'p-oai-huong',
    bong: 'p-bong',
    bi: 'p-bi',
    cuc: 'p-cuc',
    vietquat: 'p-viet-quat',
    nho: 'p-nho',
    lai: 'p-lai',
    sen: 'p-sen',
    huongduong: 'p-huong-duong',
    tra: 'p-tra',
    xoai: 'p-xoai',
    mit: 'p-mit',
    duas: 'p-duas',
    duahau: 'p-dua-hau',
    dau: 'p-dau',
}

const ProductMineralKeys = {
    thoidong: 'm-thoi-dong',
    thoivang: 'm-thoi-vang',
    thoibac: 'm-thoi-bac',
    thoibachkim: 'm-thoi-bach-kim',
    'chuon-chuon-test': 'chuon-chuon-test',
}

const OtherKeys = {
    vottrang: 'k3-vot-trang',
    votxanh: 'k3-vot-xanh',
    keodanmay: 'k3-keo-dan-may',
    nuocthan: 'k3-nuoc-than',
    dinh: 'k3-dinh',
    go: 'k3-go',
    da: 'k3-da',
    sondo: 'k3-son-do',
    sonvang: 'k3-son-vang',
    sat: 'k3-sat',
    gach: 'k3-gach',
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
    caytrong: 'caytrong',
    thuhoach: 'thuhoach',
    bando: 'bando',
    moruong: 'moruong',
    fullkho: 'fullkho',
    kc: 'kc',
    cam: 'cam',
    quayhang: 'quayhang',
    batbo: 'batbo',

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
    ProductTreeKeys,
    ProductMineralKeys,
    OtherKeys,
}
