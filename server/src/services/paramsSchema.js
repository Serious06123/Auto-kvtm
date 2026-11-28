// Danh sách tham số có thể chỉnh trên giao diện.
// default = giá trị gốc (giữ nguyên hành vi cũ). unit: s (giây), ms, %, lần, px, tỉ lệ
const groups = [
    { key: 'global', label: 'Chung' },
    { key: 'scroll', label: 'Di chuyển tầng' },
    { key: 'plant', label: 'Trồng / Thu hoạch' },
    { key: 'make', label: 'Sản xuất' },
    { key: 'sell', label: 'Bán hàng' },
    { key: 'bug', label: 'Bắt bọ' },
    { key: 'game', label: 'Mở game / Hệ thống' },
    { key: 'image', label: 'Nhận diện ảnh & Chạm' },
    { key: 'ocr', label: 'OCR / AI' },
    { key: 'watchdog', label: 'Watchdog / Tự phục hồi' },
]

const params = [
    // ===== Chung =====
    { key: 'global.speedMultiplier', group: 'global', label: 'Hệ số tốc độ thao tác (vuốt / kéo)', default: 1.0, min: 1, max: 3, step: 0.05, unit: 'x', description: '1x = tốc độ gốc. 2x = vuốt chậm gấp đôi (thích hợp máy yếu, game lag). Tác động lên duration của các thao tác vuốt/kéo ngón tay. Khi bật bù trừ thời gian nghỉ, độ trễ phát sinh sẽ tự động được trừ vào các lệnh sleep.' },
    { key: 'global.dynamicSleepCompensation', group: 'global', label: 'Tự động bù trừ thời gian nghỉ', type: 'boolean', default: true, description: 'Tự động trừ thời gian thao tác vuốt bị chậm so với 1x vào các lệnh nghỉ sleep để giữ tổng thời gian hoàn thành công việc không bị kéo dài khi chọn tốc độ chậm hơn 1x.' },

    // ===== Di chuyển tầng =====
    { key: 'scroll.upDistance', group: 'scroll', label: 'Độ dài vuốt khi lên tầng', default: 10, min: 2, max: 40, step: 0.5, unit: '%', description: 'Khoảng cách vuốt (theo % chiều cao màn hình) để lên 1 tầng.' },
    { key: 'scroll.downDistance', group: 'scroll', label: 'Độ dài vuốt khi xuống tầng', default: 10, min: 2, max: 40, step: 0.5, unit: '%', description: 'Khoảng cách vuốt để xuống 1 tầng.' },
    { key: 'scroll.swipePercent', group: 'scroll', label: 'Độ mạnh vuốt (swipe percent)', default: 1.0, min: 0.1, max: 1, step: 0.05, unit: 'tỉ lệ', description: 'Tham số percent của swipeGesture.' },
    { key: 'scroll.swipeSpeed', group: 'scroll', label: 'Tốc độ vuốt tầng', default: 0, min: 0, max: 20000, step: 100, unit: 'px/s', description: '0 = mặc định của Appium (~7500 px/s). Giảm nếu bị trượt quá tầng.' },
    { key: 'scroll.delayBetweenSwipe', group: 'scroll', label: 'Nghỉ giữa các lần vuốt', default: 0.1, min: 0, max: 3, step: 0.05, unit: 's' },
    { key: 'scroll.delayAfterScroll', group: 'scroll', label: 'Nghỉ sau khi vuốt xong', default: 0.3, min: 0, max: 3, step: 0.05, unit: 's' },
    { key: 'scroll.goDownLastMinSleep', group: 'scroll', label: 'Về tầng trệt: nghỉ tối thiểu', default: 0.6, min: 0, max: 5, step: 0.1, unit: 's' },
    { key: 'scroll.goDownLastMaxSleep', group: 'scroll', label: 'Về tầng trệt: nghỉ tối đa', default: 1.5, min: 0, max: 10, step: 0.1, unit: 's' },
    { key: 'scroll.goDownLastPerFloor', group: 'scroll', label: 'Về tầng trệt: cộng thêm mỗi tầng', default: 0.1, min: 0, max: 1, step: 0.05, unit: 's' },

    // ===== Trồng / Thu hoạch =====
    { key: 'plant.swipeDuration', group: 'plant', label: 'Tốc độ vuốt khi trồng cây (mỗi ô)', default: 25, min: 20, max: 500, step: 5, unit: 'ms', description: 'Thời gian di chuyển giữa 2 ô khi trồng. Càng lớn càng chậm, chắc chắn hơn.' },
    { key: 'plant.harvestSwipeDuration', group: 'plant', label: 'Tốc độ vuốt khi thu hoạch (mỗi ô)', default: 25, min: 20, max: 500, step: 5, unit: 'ms' },
    { key: 'plant.openMenuDelay', group: 'plant', label: 'Nghỉ sau khi mở menu cây/giỏ', default: 0.1, min: 0, max: 3, step: 0.05, unit: 's' },
    { key: 'plant.beforeSwipeDelay', group: 'plant', label: 'Nghỉ trước khi bắt đầu vuốt trồng', default: 0.1, min: 0, max: 3, step: 0.05, unit: 's' },
    { key: 'plant.harvestMaxRetry', group: 'plant', label: 'Số lần thử tìm giỏ thu hoạch', default: 10, min: 1, max: 50, step: 1, unit: 'lần' },

    // ===== Sản xuất =====
    { key: 'make.preTapCount', group: 'make', label: 'Số lần chạm thu sản phẩm trước khi làm', default: 12, min: 0, max: 50, step: 1, unit: 'lần' },
    { key: 'make.preTapDelay', group: 'make', label: 'Nghỉ giữa các lần chạm', default: 0.1, min: 0, max: 2, step: 0.05, unit: 's' },
    { key: 'make.collectDelay', group: 'make', label: 'Nghỉ khi thu sản phẩm / mở slot', default: 0.1, min: 0, max: 2, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau mỗi lần chạm tìm ô sản xuất trống hoặc thu hoạch thành phẩm.' },
    { key: 'make.dragDuration', group: 'make', label: 'Tốc độ kéo nguyên liệu vào máy', default: 150, min: 20, max: 2000, step: 10, unit: 'ms' },
    { key: 'make.delayPerItem', group: 'make', label: 'Nghỉ sau mỗi sản phẩm', default: 0.2, min: 0, max: 3, step: 0.05, unit: 's' },
    { key: 'make.afterMakeDelay', group: 'make', label: 'Nghỉ sau khi nạp đủ nguyên liệu', default: 0.2, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau khi kéo xong nguyên liệu vào máy trước khi đóng bảng.' },
    { key: 'make.closePanelDelay', group: 'make', label: 'Nghỉ khi đóng panel máy', default: 0.1, min: 0, max: 2, step: 0.05, unit: 's', description: 'Thời gian nghỉ giữa các thao tác chạm để đóng bảng máy sản xuất và quay lại game.' },
    { key: 'make.maxRetry', group: 'make', label: 'Số lần thử tìm ô sản xuất trống', default: 10, min: 1, max: 50, step: 1, unit: 'lần' },

    // ===== Bán hàng =====
    { key: 'sell.openShopDelay', group: 'sell', label: 'Nghỉ sau khi mở quầy', default: 1.0, min: 0, max: 5, step: 0.1, unit: 's', description: 'Thời gian chờ bảng bán hàng hiển thị sau khi chạm vào quầy hàng.' },
    { key: 'sell.scrollShopDuration', group: 'sell', label: 'Tốc độ vuốt danh sách quầy', default: 300, min: 50, max: 5000, step: 50, unit: 'ms' },
    { key: 'sell.scrollBackDuration', group: 'sell', label: 'Tốc độ vuốt quay lại đầu quầy', default: 3000, min: 100, max: 10000, step: 100, unit: 'ms' },
    { key: 'sell.afterScrollDelay', group: 'sell', label: 'Nghỉ sau khi cuộn quầy', default: 0.5, min: 0, max: 5, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau khi cuộn danh sách kệ hàng để chờ hình ảnh ổn định.' },
    { key: 'sell.afterScrollToStartDelay', group: 'sell', label: 'Nghỉ sau khi cuộn về đầu quầy', default: 1.5, min: 0, max: 5, step: 0.1, unit: 's', description: 'Thời gian nghỉ chờ danh sách quầy đứng yên sau khi vuốt quay lại đầu kệ (mặc định 1.5s chuẩn 3.1.6).' },
    { key: 'sell.emptySlotDelay', group: 'sell', label: 'Nghỉ sau khi bấm ô trống bán hàng', default: 0.6, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian chờ bảng chọn vật phẩm mở ra sau khi chạm ô bán trống (mặc định 0.6s chuẩn 3.1.6).' },
    { key: 'sell.selectSlotDelay', group: 'sell', label: 'Nghỉ khi chọn ô bán / đổi tab', default: 0.5, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau khi bấm vào ô bán trống hoặc bấm chuyển tab vật phẩm.' },
    { key: 'sell.collectMoneyDelay', group: 'sell', label: 'Nghỉ khi nhận tiền ô đã bán', default: 0.5, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau khi chạm thu tiền từ ô hàng đã bán thành công.' },
    { key: 'sell.eventScrollDuration', group: 'sell', label: 'Tốc độ vuốt danh sách đồ sự kiện', default: 3000, min: 100, max: 10000, step: 100, unit: 'ms' },
    { key: 'sell.idleWaitWhenFull', group: 'sell', label: 'Nghỉ chờ khi quầy đầy', default: 5, min: 0, max: 60, step: 1, unit: 's', description: 'Thời gian nghỉ mỗi lượt khi tất cả ô bán đều đầy để tránh quét ảnh liên tục 100% CPU (đặc biệt khi treo ban đêm).' },
    { key: 'sell.softRefreshCycles', group: 'sell', label: 'Làm mới quầy sau số chu kỳ trống', default: 4, min: 0, max: 50, step: 1, unit: 'chu kỳ', description: 'Đóng bảng quầy hàng và mở lại sau N chu kỳ quét trống liên tiếp để đồng bộ lại trạng thái đã bán (0 = tắt).' },
    { key: 'sell.staleRestartMinutes', group: 'sell', label: 'Khởi động lại game nếu kẹt bán quá', default: 120, min: 0, max: 720, step: 1, unit: 'phút', description: 'Thoát game vào lại rồi tiếp tục bán đủ số lượng nếu quá số phút này chưa bán thêm được món nào (mặc định 120 phút = 2 tiếng, 0 = tắt).' },
    { key: 'sell.maxStaleRestarts', group: 'sell', label: 'Giới hạn số lần khởi động lại khi kẹt bán', default: 0, min: 0, max: 50, step: 1, unit: 'lần', description: '0 = không giới hạn (bán tới khi đủ số lượng hoặc bấm Stop).' },

    // ===== Bắt bọ =====
    { key: 'bug.screenshotCount', group: 'bug', label: 'Số ảnh chụp để xác nhận bọ', default: 3, min: 1, max: 6, step: 1, unit: 'ảnh' },
    { key: 'bug.screenshotInterval', group: 'bug', label: 'Khoảng cách giữa các ảnh', default: 0.2, min: 0, max: 2, step: 0.05, unit: 's' },
    { key: 'bug.tapPotDelay', group: 'bug', label: 'Nghỉ sau khi bấm vào chậu nghi có bọ', default: 0.5, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian chờ sau khi chạm vào chậu cây để bảng bắt bọ xuất hiện.' },
    { key: 'bug.matchThreshold', group: 'bug', label: 'Ngưỡng khớp hình bọ', default: 0.6, min: 0.3, max: 0.99, step: 0.01, unit: 'tỉ lệ' },
    { key: 'bug.netMatchRate', group: 'bug', label: 'Ngưỡng tìm vợt xanh', default: 0.6, min: 0.3, max: 0.99, step: 0.01, unit: 'tỉ lệ' },
    { key: 'bug.netSwipeDuration', group: 'bug', label: 'Tốc độ vung vợt', default: 20, min: 20, max: 1000, step: 5, unit: 'ms' },
    { key: 'bug.afterNetDelay', group: 'bug', label: 'Nghỉ sau khi vung vợt', default: 0.5, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian chờ sau khi kéo vợt vào chậu trước khi đóng bảng.' },
    { key: 'bug.closePanelDelay', group: 'bug', label: 'Nghỉ sau khi đóng bảng chọn', default: 0.5, min: 0, max: 3, step: 0.05, unit: 's', description: 'Thời gian nghỉ sau khi bấm đóng bảng bắt bọ.' },
    { key: 'bug.floorRowHeight', group: 'bug', label: 'Khoảng cách pixel giữa các tầng', default: 220, min: 100, max: 400, step: 1, unit: 'px', description: 'Theo ảnh chuẩn hoá 1000x1000.' },

    // ===== Mở game =====
    { key: 'game.afterLaunchDelay', group: 'game', label: 'Chờ sau khi mở app', default: 5, min: 0, max: 60, step: 0.5, unit: 's' },
    { key: 'game.afterSelectServerDelay', group: 'game', label: 'Chờ tải game sau khi chọn server', default: 15, min: 0, max: 120, step: 1, unit: 's' },
    { key: 'game.loginRetry', group: 'game', label: 'Số lần thử tìm nút đăng nhập', default: 10, min: 1, max: 50, step: 1, unit: 'lần' },
    { key: 'game.findServerRetry', group: 'game', label: 'Số lần thử tìm server', default: 20, min: 1, max: 100, step: 1, unit: 'lần' },
    { key: 'game.backPressCount', group: 'game', label: 'Số lần bấm Back đóng popup khi vào game', default: 10, min: 0, max: 30, step: 1, unit: 'lần' },
    { key: 'game.backToGamePresses', group: 'game', label: 'Số lần bấm Back khi về màn hình chính', default: 5, min: 1, max: 15, step: 1, unit: 'lần' },
    { key: 'game.backToGameDelay', group: 'game', label: 'Nghỉ giữa các lần bấm Back', default: 0.1, min: 0, max: 2, step: 0.05, unit: 's' },
    { key: 'game.friendVisitDelay', group: 'game', label: 'Chờ khi sang nhà bạn / về nhà', default: 2, min: 0, max: 15, step: 0.5, unit: 's' },
    { key: 'game.clownSpinWait', group: 'game', label: 'Chờ vòng quay hề quay xong', default: 9, min: 1, max: 30, step: 0.5, unit: 's' },

    // ===== Nhận diện ảnh & Chạm =====
    { key: 'image.defaultMatchRate', group: 'image', label: 'Ngưỡng khớp ảnh mặc định', default: 0.9, min: 0.5, max: 0.99, step: 0.01, unit: 'tỉ lệ', description: 'Giảm nếu tool hay không tìm thấy nút, tăng nếu bấm nhầm.' },
    { key: 'image.findRetry', group: 'image', label: 'Số lần chụp lại khi tìm ảnh', default: 2, min: 1, max: 10, step: 1, unit: 'lần' },
    { key: 'image.retryDelay', group: 'image', label: 'Nghỉ giữa các lần tìm ảnh', default: 0.1, min: 0, max: 2, step: 0.05, unit: 's' },
    { key: 'image.postTapDelay', group: 'image', label: 'Thời gian đệm sau khi chạm', default: 0.05, min: 0, max: 1, step: 0.01, unit: 's', description: 'Thời gian nghỉ ngắn sau mỗi lần chạm (tap) để chống trượt cảm ứng trên máy yếu.' },
    { key: 'image.tapRandomOffset', group: 'image', label: 'Lệch ngẫu nhiên khi chạm', default: 1, min: 0, max: 10, step: 1, unit: 'px' },
    { key: 'image.touchHoldTime', group: 'image', label: 'Thời gian giữ ngón tay đầu/cuối khi vuốt', default: 50, min: 0, max: 1000, step: 10, unit: 'ms' },
    { key: 'image.minStepDuration', group: 'image', label: 'Thời gian tối thiểu mỗi bước vuốt', default: 20, min: 1, max: 200, step: 1, unit: 'ms' },

    // ===== OCR =====
    { key: 'ocr.requestTimeout', group: 'ocr', label: 'Timeout gọi OCR', default: 20000, min: 2000, max: 120000, step: 1000, unit: 'ms' },
    { key: 'ocr.startupWaitLoops', group: 'ocr', label: 'Số lần chờ OCR server khởi động (mỗi lần ~1s)', default: 15, min: 1, max: 120, step: 1, unit: 'lần' },

    // ===== Watchdog / Tự phục hồi =====
    { key: 'watchdog.enabled', group: 'watchdog', label: 'Bật Watchdog tự khôi phục', type: 'boolean', default: true, description: 'Tự động kết nối lại Appium và mở lại game khi mất session hoặc gặp lỗi liên tiếp.' },
    { key: 'watchdog.maxIdleMinutes', group: 'watchdog', label: 'Thời gian kẹt tối đa mỗi vòng', default: 20, min: 1, max: 180, step: 1, unit: 'phút', description: 'Nếu phiên không có hoạt động vượt quá số phút này (khi không tạm dừng), Watchdog sẽ thử kết nối lại session.' },
    { key: 'watchdog.maxConsecutiveErrors', group: 'watchdog', label: 'Số lỗi liên tiếp trước khi khôi phục', default: 3, min: 1, max: 20, step: 1, unit: 'lần', description: 'Số lần lỗi autoTool liên tiếp để kích hoạt kết nối lại Appium.' },
    { key: 'watchdog.maxRecoveries', group: 'watchdog', label: 'Giới hạn số lần tự khôi phục', default: 5, min: 0, max: 50, step: 1, unit: 'lần', description: '0 = không giới hạn. Nếu vượt giới hạn sẽ dừng phiên và gửi cảnh báo.' },
]

module.exports = { groups, params }
