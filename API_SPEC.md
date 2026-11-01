# 📡 API_SPEC.md — Hợp Đồng Giao Tiếp API (RESTful & Realtime WebSocket)

> **Dự án:** Hôm Nay Ăn Gì (What To Eat Today)  
> **Vai trò tài liệu:** Hợp đồng giao tiếp chuẩn mực (API Contract) giữa Frontend (React/TypeScript) và Backend (Java Spring Boot + PostgreSQL + Redis), được đối chiếu trực tiếp từ mã nguồn thực tế trong `BE/`. Dùng làm nguồn tham chiếu bắt buộc cho mọi **Agent Skill** khi sinh tầng `services/`, `types/` và tích hợp REST/Realtime.  
> **Tài liệu liên kết:** [`FE_SPEC.md`](./FE_SPEC.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

---

## 1. Quy Ước Chung (Global API Conventions)

*   **Base URL (REST):** `http://localhost:8080` (Cấu hình qua biến môi trường `VITE_API_BASE_URL`).
*   **Base URL (WebSocket/STOMP):** `ws://localhost:8080/ws` (`[PENDING_BACKEND]` — hiện `BE/pom.xml` chưa cài `spring-boot-starter-websocket`, đồng bộ phòng ăn qua REST API & Polling).
*   **Xác thực (Authentication — Ký hiệu 🔒):**
    *   Ký hiệu 🔒 chỉ biểu thị endpoint **yêu cầu xác thực danh tính** (bắt buộc đính kèm HTTP Header `Authorization: Bearer <jwt_token>`).
    *   Ký hiệu 🔒 **không** đồng nghĩa mọi người dùng đã đăng nhập đều có quyền gọi. Quyền hạn cụ thể (Admin, Chính chủ tài khoản, Chủ phòng, Thành viên phòng, Chủ nợ hay Người nợ) được quy định bắt buộc tại **Mục 1.2 — Bảng Phân Quyền Chính Thức**.
    ```http
    Authorization: Bearer <jwt_token>
    Content-Type: application/json
    ```
*   **Chuẩn Wrapper Phản Hồi (`ApiResponse<T>`):** Mọi phản hồi từ Backend đều được bọc trong cấu trúc chuẩn (`@JsonInclude(Include.NON_NULL)`):
    ```json
    {
      "code": 1000,
      "message": "Thành công",
      "result": { ... }
    }
    ```
    *   `code = 1000` (hoặc HTTP `200` không có lỗi): Thành công.
    *   `code != 1000`: Xảy ra lỗi nghiệp vụ hoặc lỗi xác thực/hệ thống (xem chi tiết tại **Mục 4 — Bảng Mã Lỗi Tập Trung Theo `ErrorCode.java`**).

### 1.1. Quy Ước Đặt Tên Trường Dữ Liệu (100% `camelCase` Theo Chuẩn Backend)
Toàn bộ Request Body, Query Params và Response JSON trong Backend (`BE/src/main/java/org/example/homnayangi/dto/`) đều sử dụng duy nhất chuẩn **`camelCase`**.
*   **Quy tắc bắt buộc cho Frontend & Skill:** Mọi interface trong `src/types/api.ts`, mọi payload gửi đi từ `src/services/*.service.ts` và mọi prop truyền xuống Component (kể cả `PlaceCard`, `ListItem`, `QRCodeDisplay`) **bắt buộc dùng đúng tên trường `camelCase` của Backend** — tuyệt đối **không** dùng `snake_case`:

| Phân hệ | Tên trường chuẩn `camelCase` (Bắt buộc dùng) | Tên `snake_case` bị cấm tuyệt đối |
| :--- | :--- | :--- |
| **Users** | `userId`, `avatarUrl`, `bankBin`, `bankAccountNumber`, `bankAccountName`, `createdAt` | ~~`user_id`~~, ~~`avatar_url`~~, ~~`bank_bin`~~, ~~`bank_account_number`~~, ~~`created_at`~~ |
| **Places** | `placeId`, `priceRange`, `imageUrl`, `latitude`, `longitude` | ~~`place_id`~~, ~~`price_range`~~, ~~`image_url`~~ |
| **Tags** | `tagId`, `tagName`, `temporary` | ~~`tag_id`~~, ~~`tag_name`~~, ~~`is_temporary`~~ |
| **Friendships** | `addresseeId`, `requesterId`, `targetUserId`, `createdAt` | ~~`addressee_id`~~, ~~`requester_id`~~, ~~`target_user_id`~~ |
| **Rooms** | `roomId`, `roomCode`, `matchedPlace`, `deckSize`, `memberUserId`, `members`, `createdAt` | ~~`room_id`~~, ~~`room_code`~~, ~~`matched_place_id`~~, ~~`deck_size`~~ |
| **Swipes** | `roomId`, `placeId`, `placeName`, `liked`, `totalLikes`, `totalDislikes`, `matched` | ~~`room_id`~~, ~~`place_id`~~, ~~`is_like`~~, ~~`total_likes`~~ |
| **Expenses** | `expenseId`, `roomId`, `payerId`, `totalAmount`, `splitType`, `itemName`, `sharerIds`, `sharerCount`, `pricePerPerson`, `amountOwed`, `paid`, `qrCodeUrl`, `fullyPaid` | ~~`expense_id`~~, ~~`payer_id`~~, ~~`total_amount`~~, ~~`split_type`~~, ~~`item_name`~~, ~~`sharer_ids`~~, ~~`amount_owed`~~, ~~`is_paid`~~, ~~`qr_code_url`~~ |

### 1.2. Bảng Phân Quyền Chính Thức Cho Toàn Bộ Endpoints (Endpoint Authorization Matrix)

> [!IMPORTANT]
> **Nguyên tắc thực thi phân quyền giữa Frontend và Backend (`SecurityConfig.java` & `@PreAuthorize`):**
> 1. **Frontend chỉ ẩn/khóa nút bấm và điều hướng giao diện theo bảng phân quyền dưới đây** nhằm đảm bảo trải nghiệm người dùng đúng ngữ cảnh.
> 2. **Backend kiểm tra độc lập tại mỗi request:** thông qua `SecurityConfig.java`, `@PreAuthorize` và kiểm tra quyền sở hữu tài nguyên trong tầng Service (`RoomService`, `ExpenseService`, `SwipeService`, `FriendshipService`, `UserController`).

| Endpoint | Quyền tối thiểu | Phạm vi dữ liệu được truy cập | Điều kiện nghiệp vụ (`BE/`) | Mã lỗi thực tế (`ErrorCode.java`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. 🔐 Auth (`/api/v1/auth`)** | | | | |
| `POST /api/v1/auth/token` | `Public` | Cấp JWT cho chính tài khoản khớp `username` & `password`. | Tài khoản tồn tại (`findByUsername`), mật khẩu đúng (`BCrypt`). | `1004` (`404 - USER_NOT_EXISTED`), `1006` (`401 - LOGIN_FAILED`) |
| `POST /api/v1/auth/introspect` | `Public` | Trạng thái hiệu lực (`valid: boolean`) của chuỗi `token` truyền vào. | Chuỗi `token` được ký bởi `SIGNER_KEY` và chưa hết hạn (5 giờ). | Luôn trả `200 OK` kèm `{ valid: true/false }` |
| `POST /api/v1/auth/send-otp` | `Public` *(Lưu ý `SecurityConfig`)* | Gửi mã OTP 6 chữ số về `email` của tài khoản đã đăng ký. | `email` tồn tại trong bảng `users`. | `1004` (`404 - USER_NOT_EXISTED`), `1002` (`401 - UNAUTHENTICATED` nếu `SecurityConfig` chặn) |
| `POST /api/v1/auth/verify-otp` | `Public` *(Lưu ý `SecurityConfig`)* | Xác minh mã `otp` tương ứng với `email` trong Redis. | Mã `otp` khớp và chưa hết hạn. | `1009` (`400 - INVALID_OTP`), `1002` (`401 - UNAUTHENTICATED` nếu `SecurityConfig` chặn) |
| `POST /api/v1/auth/forgot-password` | `Public` *(Lưu ý `SecurityConfig`)* | Gửi mã OTP khôi phục mật khẩu về `email`. | `email` tồn tại trong bảng `users`. | `1004` (`404 - USER_NOT_EXISTED`), `1002` (`401 - UNAUTHENTICATED` nếu `SecurityConfig` chặn) |
| `POST /api/v1/auth/reset-password` | `Public` *(Lưu ý `SecurityConfig`)* | Đặt lại `newPassword` khi `email` và `otp` hợp lệ. | `otp` hợp lệ trong Redis; tự động xóa OTP sau khi đổi mật khẩu. | `1009` (`400 - INVALID_OTP`), `1004` (`404 - USER_NOT_EXISTED`), `1002` (`401` nếu bị chặn) |
| **2. 👤 Users (`/api/v1/users`)** | | | | |
| `POST /api/v1/users` | `Public` | Tạo mới 1 bản ghi `User` với quyền mặc định `["ROLE_USER"]`. | `username` $\ge 3$ ký tự (duy nhất), `email` hợp lệ (duy nhất), `password` $\ge 6$ ký tự. | `1005` (`400 - USER_EXISTED`), `1101` (`400 - USERNAME_INVALID`), `1102` (`400 - PASSWORD_INVALID`), `1103` (`400 - EMAIL_INVALID`) |
| `GET /api/v1/users/me` 🔒 | `Account Owner` (`User` / `Admin`) | Hồ sơ `UserResponse` của chính người dùng đang đăng nhập (lấy từ JWT `sub`). | Đã đăng nhập hợp lệ. | `1002` (`401 - UNAUTHENTICATED`), `1004` (`404 - USER_NOT_EXISTED`) |
| `GET /api/v1/users` 🔒 | `Admin` *(Theo `SecurityConfig`)* | Danh sách toàn bộ hồ sơ `UserResponse[]` trên hệ thống. | Yêu cầu `ROLE_ADMIN` trong `SecurityConfig.java`. | `1002` (`401`), `1003` (`403 - UNAUTHORIZED`) |
| `GET /api/v1/users/{userId}` 🔒 | `User` / `Admin` *(Lưu ý `SecurityConfig`)* | Hồ sơ `UserResponse` của `userId` được chỉ định. | Bản ghi `userId` tồn tại. | `1002` (`401`), `1003` (`403` nếu `SecurityConfig` chặn `ROLE_USER`), `1004` (`404 - USER_NOT_EXISTED`) |
| `PUT /api/v1/users/{userId}` 🔒 | `Account Owner` hoặc `Admin` | - `Account Owner`: sửa `email`, `password`, `avatarUrl`, `bankBin`, `bankAccountNumber`, `bankAccountName` của chính mình.<br>- `Admin`: sửa được thông tin người dùng (không được gán `ROLE_ADMIN` qua API này). | Chống trùng email + chống gán `ROLE_ADMIN` (`CANNOT_ASSIGN_ADMIN_ROLE`). | `1005` (`400 - USER_EXISTED` nếu trùng email), `1002` (`401`), `1003` (`403`), `1008` (`400 - CANNOT_ASSIGN_ADMIN_ROLE`), `1104` (`400 - INVALID_ROLE`), `1102` (`400`), `1103` (`400`) |
| `DELETE /api/v1/users/{userId}` 🔒 | `Admin` | Xóa bản ghi người dùng `userId` khỏi hệ thống. | Người gọi có quyền `Admin`; cấm xóa tài khoản có `ROLE_ADMIN`. | `1002` (`401`), `1003` (`403`), `1007` (`400 - CANNOT_DELETE_ADMIN`), `1004` (`404 - USER_NOT_EXISTED`) |
| **3. 📍 Places (`/api/v1/places`)** | | | | |
| `POST /api/v1/places` 🔒 | `Admin` | Tạo mới địa điểm ăn uống trong danh mục toàn hệ thống. | `name` bắt buộc, `latitude` $\in [-90,90]$, `longitude` $\in [-180,180]$. | `1202` (`400 - PLACE_NAME_INVALID`), `1203` (`400 - PLACE_LATITUDE_INVALID`), `1204` (`400 - PLACE_LONGITUDE_INVALID`) |
| `GET /api/v1/places` 🔒 | `User` *(Lưu ý `SecurityConfig`)* | Danh sách địa điểm `PlaceResponse[]` theo bộ lọc toàn hệ thống. | Nếu lọc theo tọa độ phải có đủ `latitude`, `longitude`, `radius`. | `1002` (`401`), `1003` (`403` nếu `SecurityConfig` chặn `ROLE_USER`) |
| `GET /api/v1/places/{placeId}` 🔒 | `User` *(Lưu ý `SecurityConfig`)* | Chi tiết địa điểm `PlaceResponse` theo `placeId`. | `placeId` tồn tại. | `1201` (`404 - PLACE_NOT_FOUND`), `1003` (`403` nếu `SecurityConfig` chặn) |
| `PUT /api/v1/places/{placeId}` 🔒 | `Admin` | Cập nhật thông tin địa điểm `placeId` trên toàn hệ thống. | `placeId` tồn tại; dữ liệu cập nhật hợp lệ. | `1201` (`404 - PLACE_NOT_FOUND`), `1203`, `1204` |
| `DELETE /api/v1/places/{placeId}` 🔒 | `Admin` | Xóa địa điểm `placeId` khỏi danh mục hệ thống. | `placeId` tồn tại. | `1201` (`404 - PLACE_NOT_FOUND`) |
| **4. 🏷️ Tags (`/api/v1/tags`)** | | | | |
| `POST /api/v1/tags` 🔒 | `Admin` | Tạo mới Tag sở thích gốc của hệ thống. | `tagName` bắt buộc ($\le 50$ ký tự), chưa tồn tại. | `1304` (`400 - TAG_ALREADY_EXISTS`), `1001` (`400 - INVALID_KEY`) |
| `GET /api/v1/tags` 🔒 | `User` / `Admin` | Toàn bộ danh sách Tags hệ thống (`TagResponse[]`). | Đã đăng nhập hợp lệ. | `1002` (`401 - UNAUTHENTICATED`) |
| `GET /api/v1/tags/{id}` 🔒 | `User` / `Admin` | Chi tiết một Tag hệ thống theo `id`. | `id` tồn tại. | `1305` (`404 - TAG_NOT_FOUND`) |
| `PUT /api/v1/tags/{id}` 🔒 | `Admin` | Cập nhật `tagName` của một Tag hệ thống. | `id` tồn tại; `tagName` mới hợp lệ và duy nhất. | `1305` (`404 - TAG_NOT_FOUND`), `1304` (`400 - TAG_ALREADY_EXISTS`), `1001` (`400`) |
| `DELETE /api/v1/tags/{id}` 🔒 | `Admin` | Xóa một Tag khỏi hệ thống. | `id` tồn tại. | `1305` (`404 - TAG_NOT_FOUND`) |
| `GET /api/v1/tags/user/me` 🔒 | `Account Owner` (`User`) | Chỉ danh sách `UserTagResponse[]` của chính `currentUser`. | Định danh lấy trực tiếp từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| `POST /api/v1/tags/user/me/{tagId}` 🔒 | `Account Owner` (`User`) | Gắn `tagId` vào danh sách sở thích của chính `currentUser`. | `tagId` tồn tại trong hệ thống (nếu đã gắn sẽ cập nhật cờ `temporary`). | `1305` (`404 - TAG_NOT_FOUND`) |
| `PUT /api/v1/tags/user/me/{tagId}` 🔒 | `Account Owner` (`User`) | Đổi trạng thái `temporary` của `tagId` thuộc `currentUser`. | `currentUser` đã sở hữu `tagId` này; có query param `temporary`. | `1305` (`404 - TAG_NOT_FOUND`) |
| `DELETE /api/v1/tags/user/me/{tagId}` 🔒 | `Account Owner` (`User`) | Gỡ `tagId` khỏi danh sách sở thích của chính `currentUser`. | `currentUser` đang sở hữu `tagId` này. | `1305` (`404 - TAG_NOT_FOUND`) |
| **5. 🤝 Friendships (`/api/v1/friendships`)** | | | | |
| `POST /api/v1/friendships/requests/{addresseeId}` 🔒 | `User` (`Requester`) | Tạo yêu cầu kết bạn `PENDING` từ `currentUser` tới `addresseeId` (hoặc tự động `ACCEPTED` nếu đối phương đã mời trước). | `addresseeId !== currentUser.id`; đối phương không phải `ROLE_ADMIN`; chưa là bạn bè. | `1303` (`400 - CANNOT_FRIEND_SELF`), `1307` (`400 - CANNOT_FRIEND_ADMIN`), `1301` (`400 - FRIENDSHIP_ALREADY_EXISTS`), `1004` (`404 - USER_NOT_EXISTED`) |
| `PUT /api/v1/friendships/requests/{requesterId}/accept` 🔒 | `Friendship Addressee` | Chuyển lời mời giữa `requesterId` và `currentUser` sang `ACCEPTED`. | Tồn tại lời mời `PENDING` gửi tới `currentUser`. | `1302` (`404 - FRIENDSHIP_NOT_FOUND`), `1301` (`400 - FRIENDSHIP_ALREADY_EXISTS`) |
| `DELETE /api/v1/friendships/{targetUserId}` 🔒 | `Friendship Participant` | Xóa bạn bè (`ACCEPTED`) hoặc từ chối/thu hồi lời mời (`PENDING`) giữa `currentUser` và `targetUserId`. | Tồn tại bản ghi kết bạn mà `currentUser` là `requester` hoặc `addressee`. | `1302` (`404 - FRIENDSHIP_NOT_FOUND`) |
| `GET /api/v1/friendships` 🔒 | `Account Owner` (`User`) | Danh sách bạn bè đã `ACCEPTED` của chính `currentUser`. | Định danh lấy từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| `GET /api/v1/friendships/requests/incoming` 🔒 | `Account Owner` (`User`) | Danh sách lời mời `PENDING` gửi đến chính `currentUser` (`addressee`). | Định danh lấy từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| `GET /api/v1/friendships/requests/outgoing` 🔒 | `Account Owner` (`User`) | Danh sách lời mời `PENDING` do chính `currentUser` gửi đi (`requester`). | Định danh lấy từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| **6. 🏠 Rooms (`/api/v1/rooms`)** | | | | |
| `POST /api/v1/rooms` 🔒 | `User` *(trở thành `Room Host`)* | Tạo phòng mới (`OPEN`) kèm tọa độ GPS, bán kính & kích thước bộ bài. | `latitude` $\in [-90,90]$ (bắt buộc), `longitude` $\in [-180,180]$ (bắt buộc), `radius` $\ge 0.1$, `deckSize` $\in [3,50]$. | `1203` (`400 - PLACE_LATITUDE_INVALID`), `1204` (`400 - PLACE_LONGITUDE_INVALID`), `1001` (`400 - INVALID_KEY`) |
| `POST /api/v1/rooms/join/{roomCode}` 🔒 | `User` | Thêm `currentUser` vào danh sách thành viên phòng có mã `roomCode`. | Phòng tồn tại, đang `OPEN`, và user chưa ở trong phòng. | `2001` (`404 - ROOM_NOT_FOUND`), `2005` (`400 - ROOM_NOT_OPEN`), `2006` (`400 - USER_ALREADY_IN_ROOM`) |
| `GET /api/v1/rooms/my-rooms` 🔒 | `Account Owner` (`User`) | Danh sách các phòng (`OPEN`/`SWIPING`) mà `currentUser` đang tham gia. | Định danh lấy từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| `GET /api/v1/rooms/{roomId}` 🔒 | `Room Member` | Chi tiết phòng `roomId` và danh sách `members: UserResponse[]`. | `currentUser` thuộc danh sách thành viên của phòng `roomId`. | `2001` (`404 - ROOM_NOT_FOUND`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| `POST /api/v1/rooms/{roomId}/deck` 🔒 | `Room Member` | Khởi tạo hoặc lấy lại bộ bài (`PlaceResponse[]`) cho phòng (Idempotent + Foursquare hybrid fill). | `currentUser` là thành viên phòng; phòng có tọa độ và có ít nhất 3 quán quanh bán kính. | `2001` (`404`), `2007` (`403`), `2012` (`400 - ROOM_LOCATION_NOT_SET`), `1206` (`400 - NO_PLACES_NEARBY`) |
| `GET /api/v1/rooms/{roomId}/deck` 🔒 | `Room Member` | Lấy danh sách bộ bài (`PlaceResponse[]`) đã khóa của phòng `roomId`. | `currentUser` là thành viên của phòng `roomId`. | `2001` (`404 - ROOM_NOT_FOUND`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| `POST /api/v1/rooms/{roomId}/start` 🔒 | `Room Host` | Tự động sinh/khóa Deck (nếu chưa có) và chuyển trạng thái phòng sang `SWIPING`. | `room.host.id === currentUser.id`. | `2001` (`404`), `2004` (`403 - NOT_ROOM_HOST`), `2012` (`400 - ROOM_LOCATION_NOT_SET`), `1206` (`400 - NO_PLACES_NEARBY`) |
| `POST /api/v1/rooms/{roomId}/select-place` 🔒 | `Room Host` | Gán `matchedPlace` cho phòng `roomId` và chuyển trạng thái sang `CLOSED`. | `room.host.id === currentUser.id`; `placeId` thuộc deck của phòng; phòng **chưa tạo hóa đơn (`Expense`)**. | `2001` (`404`), `2004` (`403 - NOT_ROOM_HOST`), `1201` (`404`), `1205` (`400 - PLACE_NOT_IN_ROOM_DECK`), `2013` (`400 - CANNOT_CHANGE_PLACE_AFTER_EXPENSE`), `2009` (`429 - ROOM_BUSY`) |
| `POST /api/v1/rooms/{roomId}/close` 🔒 | `Room Host` | Đóng phòng `roomId` (chuyển sang `CLOSED`). | `room.host.id === currentUser.id`; phòng chưa `CLOSED`. | `2001` (`404`), `2004` (`403 - NOT_ROOM_HOST`), `2011` (`400 - ROOM_ALREADY_CLOSED`), `2009` (`429 - ROOM_BUSY`) |
| `DELETE /api/v1/rooms/{roomId}/leave` 🔒 | `Room Member` | Xóa `currentUser` khỏi phòng (nếu là Host rời phòng thì phòng tự động `CLOSED`). | `currentUser` đang là thành viên của phòng `roomId`. | `2001` (`404 - ROOM_NOT_FOUND`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| `DELETE /api/v1/rooms/{roomId}/members/{memberUserId}` 🔒 | `Room Host` | Xóa (kick) thành viên `memberUserId` khỏi phòng `roomId`. | `room.host.id === currentUser.id`; không được tự kick chính mình. | `2001` (`404`), `2004` (`403 - NOT_ROOM_HOST`), `2010` (`400 - CANNOT_KICK_SELF`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| `DELETE /api/v1/rooms/{roomId}` 🔒 | `Room Host` | Xóa hoàn toàn phòng `roomId`, `room_places` và liên kết thành viên. | `room.host.id === currentUser.id`. | `2001` (`404 - ROOM_NOT_FOUND`), `2004` (`403 - NOT_ROOM_HOST`) |
| **7. 👆 Swipes (`/api/v1/swipes`)** | | | | |
| `POST /api/v1/swipes` 🔒 | `Room Member` | Ghi nhận lượt quẹt (`liked`) của chính `currentUser` cho `placeId` trong `roomId`. | Phòng đang `SWIPING`; `currentUser` là thành viên; `placeId` thuộc Deck; chưa từng quẹt `placeId` này. | `2001` (`404`), `2008` (`400 - ROOM_NOT_SWIPING`), `2007` (`403 - NOT_ROOM_MEMBER`), `1201` (`404`), `1205` (`400 - PLACE_NOT_IN_ROOM_DECK`), `2014` (`400 - ALREADY_SWIPED`), `2009` (`429 - ROOM_BUSY`) |
| `GET /api/v1/swipes/rooms/{roomId}/me` 🔒 | `Room Member` | Lịch sử các địa điểm đã quẹt của chính `currentUser` trong `roomId`. | `currentUser` là thành viên của phòng `roomId`. | `2001` (`404 - ROOM_NOT_FOUND`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| `GET /api/v1/swipes/rooms/{roomId}/results` 🔒 | `Room Member` | Bảng tổng hợp lượt `totalLikes`, `totalDislikes`, `matched` của phòng `roomId`. | `currentUser` là thành viên của phòng `roomId`. | `2001` (`404 - ROOM_NOT_FOUND`), `2007` (`403 - NOT_ROOM_MEMBER`) |
| **8. 💰 Expenses (`/api/v1/expenses`)** | | | | |
| `POST /api/v1/expenses` 🔒 | `Room Member` | Tạo hóa đơn chia tiền mới (`UNPAID`) kèm tự động sinh link `VietQR` cho từng khoản nợ. | Phòng đã `CLOSED`; phòng chưa có hóa đơn; `payer` và `sharers` thuộc phòng; tổng `items.price === totalAmount`. | `2001` (`404`), `3003` (`400 - ROOM_NOT_CLOSED`), `3004` (`400 - EXPENSE_ALREADY_EXISTS`), `3010` (`400 - PAYER_NOT_IN_ROOM`), `3009` (`400 - SHARER_NOT_IN_ROOM`), `3002` (`400 - BILL_AMOUNT_MISMATCH`), `2009` (`429 - ROOM_BUSY`) |
| `GET /api/v1/expenses/{expenseId}` 🔒 | `Room Member` | Chi tiết hóa đơn `expenseId` (gồm `items`, `splits` và `qrCodeUrl`). | Hóa đơn `expenseId` tồn tại. | `3001` (`404 - EXPENSE_NOT_FOUND`) |
| `GET /api/v1/expenses/room/{roomId}` 🔒 | `Room Member` | Danh sách hóa đơn `ExpenseResponse[]` của phòng `roomId`. | Phòng `roomId` tồn tại. | `2001` (`404 - ROOM_NOT_FOUND`) |
| `GET /api/v1/expenses/my-debts` 🔒 | `Account Owner` (`User`) | Danh sách khoản nợ chưa trả (`paid === false`) của chính `currentUser` kèm `payer` và `qrCodeUrl`. | Định danh lấy từ JWT token. | `1002` (`401 - UNAUTHENTICATED`) |
| `PATCH /api/v1/expenses/{expenseId}/splits/{userId}/pay` 🔒 | `Expense Payer` **hoặc** `Expense Debtor` (`currentUser.id === userId`) | Đánh dấu `paid = true` cho phần nợ của `userId` trong `expenseId`. | Chỉ chủ nợ (`expense.payer`) hoặc chính người nợ đó (`userId`) mới được xác nhận; khoản nợ chưa trả trước đó. | `1003` (`403 - UNAUTHORIZED`), `3001` (`404 - EXPENSE_NOT_FOUND`), `3005` (`404 - SPLIT_NOT_FOUND`), `3006` (`400 - ALREADY_PAID`) |
| `PATCH /api/v1/expenses/{expenseId}/pay-all` 🔒 | `Expense Payer` | Đánh dấu toàn bộ các khoản chia trong `expenseId` là `paid = true` (`FULLY_PAID`). | Chỉ chủ nợ (`expense.payer.id === currentUser.id`) mới có quyền gọi. | `3007` (`403 - NOT_EXPENSE_PAYER`), `3001` (`404 - EXPENSE_NOT_FOUND`) |
| `DELETE /api/v1/expenses/{expenseId}` 🔒 | `Expense Payer` **hoặc** `Room Host` | Xóa hoàn toàn hóa đơn `expenseId` khỏi phòng. | Người gọi là `expense.payer` hoặc `room.host`, **và** `expense.status === 'UNPAID'`. | `1003` (`403 - UNAUTHORIZED`), `4002` (`400 - CANNOT_DELETE_PAID_EXPENSE`), `3001` (`404 - EXPENSE_NOT_FOUND`) |

---

## 2. Đặc Tả Chi Tiết 8 Phân Hệ RESTful API

### 2.1. 🔐 Auth (`/api/v1/auth`)

#### 1) `POST /api/v1/auth/token` — Đăng nhập lấy JWT Token
*   **Yêu cầu xác thực:** Công khai (Public).
*   **Lưu ý từ `AuthenticationService.java`:** Chỉ tìm kiếm theo `username` (`findByUsername`), không hỗ trợ nhập email. Token có hiệu lực **5 giờ** (`HS512`).
*   **Request Body (`AuthenticationRequest`):**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
*   **Response (`result` — `AuthenticationResponse`):**
    ```json
    {
      "token": "eyJhbGciOiJIUzUxMiJ9...",
      "authenticated": true
    }
    ```

#### 2) `POST /api/v1/auth/introspect` — Kiểm tra tính hợp lệ của Token
*   **Yêu cầu xác thực:** Công khai (Public).
*   **Request Body (`IntrospectRequest`):**
    ```json
    {
      "token": "eyJhbGciOiJIUzUxMiJ9..."
    }
    ```
*   **Response (`result` — `IntrospectResponse`):**
    ```json
    {
      "valid": true
    }
    ```

#### 3) `POST /api/v1/auth/send-otp` — Gửi mã OTP về Email
*   **Trạng thái trong `BE/`:** Đã cài đặt tại `AuthenticationController.java` (Lưu ý: cần Backend mở trong `PUBLIC_ENDPOINTS` của `SecurityConfig.java`).
*   **Request Body (`SendOtpRequest`):**
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Response (`result`):** `"Mã OTP đã được gửi đến email của bạn"`

#### 4) `POST /api/v1/auth/verify-otp` — Kiểm tra mã OTP
*   **Request Body (`VerifyOtpRequest`):**
    ```json
    {
      "email": "user@example.com",
      "otp": "123456"
    }
    ```
*   **Response (`result` — `VerifyOtpResponse`):**
    ```json
    {
      "verified": true
    }
    ```

#### 5) `POST /api/v1/auth/forgot-password` — Yêu cầu gửi OTP khôi phục mật khẩu
*   **Request Body (`SendOtpRequest`):**
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Response (`result`):** `"Mã khôi phục mật khẩu đã được gửi đến email của bạn"`

#### 6) `POST /api/v1/auth/reset-password` — Đặt lại mật khẩu mới bằng OTP
*   **Request Body (`ResetPasswordRequest`):**
    ```json
    {
      "email": "user@example.com",
      "otp": "123456",
      "newPassword": "newpassword123"
    }
    ```
*   **Response (`result`):** `"Đặt lại mật khẩu thành công"`

---

### 2.2. 👤 Users (`/api/v1/users`)

#### 1) `POST /api/v1/users` — Đăng ký tài khoản mới
*   **Yêu cầu xác thực:** Công khai (Public).
*   **Ràng buộc Validation:** `username` tối thiểu 3 ký tự (`1101`); `email` đúng định dạng email (`1103`); `password` tối thiểu 6 ký tự (`1102`); `avatarUrl` tùy chọn; trùng `username`/`email` trả mã `1005` (`USER_EXISTED`).
*   **Request Body (`UserCreationRequest`):**
    ```json
    {
      "username": "johndoe",
      "email": "john@example.com",
      "password": "123456",
      "avatarUrl": "https://..."
    }
    ```
*   **Response (`result` — `UserResponse`):**
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "username": "johndoe",
      "email": "john@example.com",
      "avatarUrl": "https://...",
      "bankBin": null,
      "bankAccountNumber": null,
      "bankAccountName": null,
      "status": "ACTIVE",
      "createdAt": "2026-01-01T00:00:00",
      "roles": ["ROLE_USER"]
    }
    ```

#### 2) `GET /api/v1/users/me` 🔒 — Lấy thông tin tài khoản đang đăng nhập
*   **Mô tả:** Trích xuất `username` từ JWT token hiện tại và trả về `UserResponse` đầy đủ của chính người dùng đó.
*   **Response (`result`):** `UserResponse`.

#### 3) `GET /api/v1/users` 🔒 — Lấy danh sách tất cả người dùng (Dành cho Admin)
*   **Request:** Không có body/params.
*   **Response (`result`):** Mảng `UserResponse[]`.

#### 4) `GET /api/v1/users/{userId}` 🔒 — Lấy thông tin người dùng theo ID
*   **Path Variable:** `userId` (`UUID` — ID của người dùng).
*   **Response (`result`):** `UserResponse`.

#### 5) `PUT /api/v1/users/{userId}` 🔒 — Cập nhật thông tin cá nhân & Ngân hàng VietQR
*   **Path Variable:** `userId` (`UUID`).
*   **Request Body (`UserUpdateRequest` — Tất cả tùy chọn):**
    ```json
    {
      "password": "newpass123",
      "email": "new@example.com",
      "avatarUrl": "https://...",
      "bankBin": "970422",
      "bankAccountNumber": "0123456789",
      "bankAccountName": "NGUYEN VAN A",
      "roles": ["ROLE_USER"]
    }
    ```
*   **Response (`result`):** `UserResponse` sau khi cập nhật.

#### 6) `DELETE /api/v1/users/{userId}` 🔒 — Xóa người dùng (Dành cho Admin)
*   **Path Variable:** `userId` (`UUID`).
*   **Response (`result`):** `"User has been deleted successfully"`.

---

### 2.3. 📍 Places (`/api/v1/places`)

#### 1) `POST /api/v1/places` 🔒 — Tạo địa điểm ăn uống mới (Dành cho Admin)
*   **Ràng buộc Validation:** `name` bắt buộc (`1202`); `latitude` bắt buộc trong khoảng `[-90, 90]` (`1203`); `longitude` bắt buộc trong khoảng `[-180, 180]` (`1204`); `priceRange` nhận giá trị `1 | 2 | 3` (tùy chọn); `category`, `imageUrl`, `address` tùy chọn.
*   **Request Body (`PlaceCreationRequest`):**
    ```json
    {
      "name": "Bún bò Huế Mụ Rú",
      "category": "Bún bò",
      "priceRange": 2,
      "imageUrl": "https://...",
      "address": "123 Lê Lợi, Q.1",
      "latitude": 10.776889,
      "longitude": 106.700806
    }
    ```
*   **Response (`result` — `PlaceResponse`):**
    ```json
    {
      "id": "uuid",
      "name": "Bún bò Huế Mụ Rú",
      "category": "Bún bò",
      "priceRange": 2,
      "imageUrl": "https://...",
      "address": "123 Lê Lợi, Q.1",
      "latitude": 10.776889,
      "longitude": 106.700806
    }
    ```

#### 2) `GET /api/v1/places` 🔒 — Tìm kiếm & lọc danh sách địa điểm
*   **Query Params (Tất cả tùy chọn):**
    | Tên | Kiểu | Mô tả |
    | :--- | :--- | :--- |
    | `name` | `string` | Tìm kiếm theo tên địa điểm |
    | `category` | `string` | Lọc theo danh mục món ăn |
    | `latitude` | `number` | Vĩ độ hiện tại (cần đi kèm `longitude` và `radius`) |
    | `longitude` | `number` | Kinh độ hiện tại |
    | `radius` | `number` | Bán kính tìm kiếm tính bằng **km** |
*   **Thứ tự ưu tiên xử lý trên Backend (`PlaceController.java`):**
    1. Có đủ `latitude` + `longitude` + `radius` $\rightarrow$ Tìm địa điểm trong bán kính gần đó (có thể kết hợp `category`).
    2. Có `name` $\rightarrow$ Tìm theo tên địa điểm.
    3. Có `category` $\rightarrow$ Lọc theo danh mục.
    4. Không truyền param nào $\rightarrow$ Trả về tất cả địa điểm.
*   **Response (`result`):** Mảng `PlaceResponse[]`.

#### 3) `GET /api/v1/places/{placeId}` 🔒 — Lấy chi tiết một địa điểm
*   **Path Variable:** `placeId` (`UUID`).
*   **Response (`result`):** `PlaceResponse`.

#### 4) `PUT /api/v1/places/{placeId}` 🔒 — Cập nhật thông tin địa điểm (Admin)
*   **Path Variable:** `placeId` (`UUID`).
*   **Request Body (Tất cả tùy chọn):** Cùng cấu trúc với `POST /api/v1/places`.
*   **Response (`result`):** `PlaceResponse` đã cập nhật.

#### 5) `DELETE /api/v1/places/{placeId}` 🔒 — Xóa địa điểm (Admin)
*   **Path Variable:** `placeId` (`UUID`).
*   **Response (`result`):** `"Place has been deleted successfully"`.

---

### 2.4. 🏷️ Tags (`/api/v1/tags`)

#### 1) `POST /api/v1/tags` 🔒 — Tạo Tag sở thích hệ thống (Admin)
*   **Ràng buộc:** `tagName` bắt buộc, tối đa 50 ký tự (`1001 - INVALID_KEY`), duy nhất (`1304 - TAG_ALREADY_EXISTS`).
*   **Request Body:** `{ "tagName": "Ẩm thực Nhật" }`
*   **Response (`result` — `TagResponse`):** `{ "id": "uuid", "tagName": "Ẩm thực Nhật" }`

#### 2) `GET /api/v1/tags` 🔒 — Lấy tất cả Tags hệ thống
*   **Response (`result`):** Mảng `TagResponse[]`.

#### 3) `GET /api/v1/tags/{id}` 🔒 — Lấy thông tin chi tiết một Tag
*   **Path Variable:** `id` (`UUID`).
*   **Response (`result`):** `TagResponse`.

#### 4) `PUT /api/v1/tags/{id}` 🔒 — Cập nhật Tag hệ thống (Dành cho Admin)
*   **Path Variable:** `id` (`UUID`).
*   **Request Body:** `{ "tagName": "Ẩm thực Nhật Bản" }`
*   **Response (`result`):** `TagResponse`.

#### 5) `DELETE /api/v1/tags/{id}` 🔒 — Xóa Tag hệ thống (Admin)
*   **Path Variable:** `id` (`UUID`).
*   **Response (`result`):** `"Tag has been deleted successfully"`.

#### 6) `GET /api/v1/tags/user/me` 🔒 — Lấy danh sách Tags sở thích của người dùng hiện tại
*   **Response (`result` — `UserTagResponse[]`):**
    ```json
    [
      {
        "tag": {
          "id": "uuid",
          "tagName": "Ẩm thực Nhật"
        },
        "temporary": false
      }
    ]
    ```

#### 7) `POST /api/v1/tags/user/me/{tagId}` 🔒 — Thêm Tag sở thích cho người dùng hiện tại
*   **Path Variable:** `tagId` (`UUID` — ID tag muốn thêm).
*   **Query Params:** `temporary` (`boolean`, mặc định `false` — `true` nếu là sở thích/tâm trạng tạm thời cho phiên ghép phòng này).
*   **Ví dụ URL:** `POST /api/v1/tags/user/me/3fa85f64-5717-4562-b3fc-2c963f66afa6?temporary=true`
*   **Response (`result`):** `UserTagResponse`.

#### 8) `PUT /api/v1/tags/user/me/{tagId}` 🔒 — Cập nhật trạng thái Tag cá nhân
*   **Path Variable:** `tagId` (`UUID`).
*   **Query Params:** `temporary` (`boolean`, **bắt buộc** — `true` = tạm thời, `false` = cố định).
*   **Response (`result`):** `UserTagResponse`.

#### 9) `DELETE /api/v1/tags/user/me/{tagId}` 🔒 — Xóa Tag khỏi danh sách sở thích cá nhân
*   **Path Variable:** `tagId` (`UUID`).
*   **Response (`result`):** `"User tag has been removed successfully"`.

---

### 2.5. 🤝 Friendships (`/api/v1/friendships`)

> **Trạng thái kết bạn (`FriendshipStatus`):** `'PENDING'` | `'ACCEPTED'`

#### 1) `POST /api/v1/friendships/requests/{addresseeId}` 🔒 — Gửi lời mời kết bạn
*   **Path Variable:** `addresseeId` (`UUID` — ID người nhận lời mời).
*   **Request Body:** Không có.
*   **Response (`result` — `FriendshipResponse`):**
    ```json
    {
      "requester": {
        "id": "uuid",
        "username": "alice",
        "email": "alice@example.com",
        "avatarUrl": "https://...",
        "status": "ACTIVE",
        "createdAt": "2026-01-01T00:00:00",
        "roles": ["ROLE_USER"]
      },
      "addressee": {
        "id": "uuid",
        "username": "bob",
        "email": "bob@example.com",
        "avatarUrl": null,
        "status": "ACTIVE",
        "createdAt": "2026-01-01T00:00:00",
        "roles": ["ROLE_USER"]
      },
      "status": "PENDING",
      "createdAt": "2026-01-01T00:00:00"
    }
    ```

#### 2) `PUT /api/v1/friendships/requests/{requesterId}/accept` 🔒 — Chấp nhận lời mời kết bạn
*   **Path Variable:** `requesterId` (`UUID` — ID người đã gửi lời mời cho mình).
*   **Request Body:** Không có.
*   **Response (`result`):** `FriendshipResponse` với `status: "ACCEPTED"`.

#### 3) `DELETE /api/v1/friendships/{targetUserId}` 🔒 — Hủy kết bạn / Từ chối / Thu hồi lời mời
*   **Path Variable:** `targetUserId` (`UUID` — ID của người dùng đối phương).
*   **Response (`result`):** `"Hủy kết bạn hoặc từ chối yêu cầu thành công"`.

#### 4) `GET /api/v1/friendships` 🔒 — Lấy danh sách bạn bè chính thức
*   **Response (`result`):** Mảng `UserResponse[]`.

#### 5) `GET /api/v1/friendships/requests/incoming` 🔒 — Lấy danh sách lời mời kết bạn gửi ĐẾN mình
*   **Response (`result`):** Mảng `FriendshipResponse[]` (`status: "PENDING"`).

#### 6) `GET /api/v1/friendships/requests/outgoing` 🔒 — Lấy danh sách lời mời kết bạn mình ĐÃ GỬI ĐI
*   **Response (`result`):** Mảng `FriendshipResponse[]` (`status: "PENDING"`).

---

### 2.6. 🏠 Rooms (`/api/v1/rooms`)

> **Trạng thái phòng (`RoomStatus`):** `'OPEN'` | `'SWIPING'` | `'CLOSED'`

#### 1) `POST /api/v1/rooms` 🔒 — Tạo phòng ăn mới
*   **Ràng buộc Validation (`CreateRoomRequest.java`):**
    *   `latitude` (**bắt buộc**, `[-90.0, 90.0]`, mã lỗi `1203 - PLACE_LATITUDE_INVALID`).
    *   `longitude` (**bắt buộc**, `[-180.0, 180.0]`, mã lỗi `1204 - PLACE_LONGITUDE_INVALID`).
    *   `name` (tùy chọn, khuyến nghị nhập tên phòng).
    *   `radius` (tùy chọn, mặc định `5.0` km, tối thiểu `0.1`).
    *   `deckSize` (tùy chọn, mặc định `15` quán, trong khoảng `[3, 50]`).
*   **Request Body (`CreateRoomRequest`):**
    ```json
    {
      "name": "Nhóm ăn trưa Quận 1",
      "latitude": 10.776889,
      "longitude": 106.700806,
      "radius": 5.0,
      "deckSize": 15
    }
    ```
*   **Response (`result` — `RoomResponse`):**
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Nhóm ăn trưa Quận 1",
      "roomCode": "ABC123",
      "host": {
        "id": "uuid",
        "username": "alice",
        "email": "alice@example.com",
        "avatarUrl": null,
        "status": "ACTIVE",
        "createdAt": "2026-01-01T00:00:00",
        "roles": ["ROLE_USER"]
      },
      "status": "OPEN",
      "matchedPlace": null,
      "latitude": 10.776889,
      "longitude": 106.700806,
      "radius": 5.0,
      "deckSize": 15,
      "createdAt": "2026-10-11T16:00:00",
      "members": [
        {
          "id": "uuid",
          "username": "alice",
          "email": "alice@example.com",
          "avatarUrl": null,
          "status": "ACTIVE",
          "createdAt": "2026-01-01T00:00:00",
          "roles": ["ROLE_USER"]
        }
      ]
    }
    ```

#### 2) `POST /api/v1/rooms/join/{roomCode}` 🔒 — Tham gia phòng bằng mã 6 ký tự
*   **Path Variable:** `roomCode` (`string` — Mã phòng, ví dụ `ABC123`).
*   **Request Body:** Không có.
*   **Response (`result`):** `RoomResponse` đầy đủ kèm danh sách `members`.

#### 3) `GET /api/v1/rooms/my-rooms` 🔒 — Lấy danh sách phòng đang hoạt động của tôi
*   **Mô tả:** Trả về các phòng người dùng hiện tại đang tham gia có trạng thái `OPEN` hoặc `SWIPING` (trường `members` sẽ không đính kèm để tối ưu hiệu năng).
*   **Response (`result`):** Mảng `RoomResponse[]`.

#### 4) `GET /api/v1/rooms/{roomId}` 🔒 — Lấy chi tiết phòng & danh sách thành viên
*   **Path Variable:** `roomId` (`UUID`).
*   **Response (`result`):** `RoomResponse` (có đầy đủ mảng `members: UserResponse[]`).

#### 5) `POST /api/v1/rooms/{roomId}/deck` 🔒 — Khởi tạo hoặc lấy lại bộ bài của phòng (Idempotent)
*   **Path Variable:** `roomId` (`UUID`).
*   **Mô tả:** Nếu phòng đã có bộ bài trong bảng `room_places`, trả về ngay danh sách đó. Nếu chưa có, Backend quét các quán trong bán kính Haversine từ DB nội bộ, kết hợp gọi Foursquare Places API nếu thiếu quán, trộn ngẫu nhiên theo `deckSize` và khóa cố định vào `room_places`.
*   **Response (`result`):** Mảng `PlaceResponse[]`.

#### 6) `GET /api/v1/rooms/{roomId}/deck` 🔒 — Lấy danh sách bộ bài đã khóa của phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Response (`result`):** Mảng `PlaceResponse[]`.

#### 7) `POST /api/v1/rooms/{roomId}/start` 🔒 — Bắt đầu phiên quẹt thẻ (Chỉ Host)
*   **Path Variable:** `roomId` (`UUID`).
*   **Ràng buộc:** Chỉ chủ phòng (`host`) mới có quyền gọi (`2004 - NOT_ROOM_HOST`). Tự động gọi `generateOrGetDeck(roomId)` nếu phòng chưa có bộ bài, sau đó chuyển trạng thái phòng từ `OPEN` sang `SWIPING`.
*   **Response:** `{ "code": 1000, "message": "Bắt đầu phiên quẹt chọn địa điểm thành công", "result": null }`

#### 8) `POST /api/v1/rooms/{roomId}/select-place` 🔒 — Host chủ động chốt quán cho phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Mục đích:** Dùng khi kết quả bình chọn bị **hòa điểm**, hoặc Host muốn chốt sớm / thay đổi quán trước khi tạo hóa đơn chia tiền.
*   **Ràng buộc Nghiệp vụ:**
    *   Chỉ **Host** mới có quyền gọi (`2004 - NOT_ROOM_HOST`).
    *   `placeId` bắt buộc phải nằm trong bộ bài của phòng (`1205 - PLACE_NOT_IN_ROOM_DECK`).
    *   Nếu phòng đã tạo hóa đơn (`Expense`) thì không được phép đổi quán nữa (`2013 - CANNOT_CHANGE_PLACE_AFTER_EXPENSE`).
*   **Request Body (`SelectPlaceRequest`):**
    ```json
    {
      "placeId": "7fa85f64-5717-4562-b3fc-2c963f66afa9"
    }
    ```
*   **Response (`result`):** `RoomResponse` với `matchedPlace` đã chốt và `status = "CLOSED"`.

#### 9) `POST /api/v1/rooms/{roomId}/close` 🔒 — Host chủ động đóng phòng ăn
*   **Path Variable:** `roomId` (`UUID`).
*   **Ràng buộc:** Chỉ **Host** mới có quyền gọi (`2004`); phòng phải đang ở trạng thái `OPEN` hoặc `SWIPING` (nếu đã `CLOSED` sẽ trả về lỗi `2011 - ROOM_ALREADY_CLOSED`).
*   **Response:** `{ "code": 1000, "message": "Đã đóng phòng ăn thành công", "result": null }`

#### 10) `DELETE /api/v1/rooms/{roomId}/leave` 🔒 — Thành viên tự rời khỏi phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Lưu ý:** Nếu người rời phòng là Host, phòng tự động chuyển sang `CLOSED`.
*   **Response (`result`):** `"Đã rời khỏi phòng thành công"`.

#### 11) `DELETE /api/v1/rooms/{roomId}/members/{memberUserId}` 🔒 — Host xóa (kick) thành viên khỏi phòng
*   **Path Variables:** `roomId` (`UUID`), `memberUserId` (`UUID`).
*   **Response (`result`):** `"Xóa thành viên thành công"`.

#### 12) `DELETE /api/v1/rooms/{roomId}` 🔒 — Host xóa hoàn toàn phòng ăn
*   **Path Variable:** `roomId` (`UUID`).
*   **Response (`result`):** `"Đã xóa phòng ăn thành công"`.

---

### 2.7. 👆 Swipes (`/api/v1/swipes`)

#### 1) `POST /api/v1/swipes` 🔒 — Quẹt Thích hoặc Bỏ qua một địa điểm trong phòng
*   **Request Body (`SwipeRequest`):**
    ```json
    {
      "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "placeId": "7fa85f64-5717-4562-b3fc-2c963f66afa9",
      "liked": true
    }
    ```
*   **Response (`result`):** `null`
*   **Cơ chế Matching tự động trên Backend (`SwipeService.java`):**
    *   **Luồng 1 (100% Đồng thuận tức thì):** Khi tất cả thành viên hiện tại trong phòng đều quẹt `liked = true` cho cùng một quán $\rightarrow$ Tự động chốt `matchedPlace` và chuyển `status = "CLOSED"`.
    *   **Luồng 2 (Cao điểm nhất khi hết bộ bài):** Khi tất cả thành viên hiện tại đã quẹt hết bộ bài, quán có `totalLikes > 0` cao nhất và không bị hòa điểm sẽ tự động được chọn làm `matchedPlace` (`status = "CLOSED"`). Nếu hòa điểm hoặc toàn bộ 0 Like, phòng giữ trạng thái chờ Host gọi `/select-place`.
    *   **Ràng buộc:** Mỗi thành viên chỉ được quẹt mỗi địa điểm **1 lần duy nhất** trong phòng. Quẹt lại sẽ trả về lỗi `2014` (`ALREADY_SWIPED`).

#### 2) `GET /api/v1/swipes/rooms/{roomId}/me` 🔒 — Lấy lịch sử đã quẹt của bản thân trong phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Response (`result` — `UserSwipeHistoryItem[]`):**
    ```json
    [
      {
        "placeId": "7fa85f64-5717-4562-b3fc-2c963f66afa9",
        "placeName": "Quán Lẩu Cua Đồng",
        "liked": true
      }
    ]
    ```

#### 3) `GET /api/v1/swipes/rooms/{roomId}/results` 🔒 — Lấy bảng tổng hợp kết quả bình chọn của phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Mô tả:** Sắp xếp giảm dần theo `totalLikes`, chỉ tính lượt quẹt của các thành viên hiện còn trong phòng.
*   **Response (`result` — `RoomSwipeResultItem[]` / `RoomPlaceResultResponse[]`):**
    ```json
    [
      {
        "placeId": "7fa85f64-5717-4562-b3fc-2c963f66afa9",
        "placeName": "Quán Lẩu Cua Đồng",
        "totalLikes": 3,
        "totalDislikes": 0,
        "matched": true
      }
    ]
    ```

---

### 2.8. 💰 Expenses (`/api/v1/expenses`)

> **Loại chia tiền (`SplitType`):** `'EVENLY'` (Chia đều) | `'BY_ITEM'` (Chia theo món)  
> **Trạng thái hóa đơn (`ExpenseStatus`):** `'UNPAID'` | `'PARTIALLY_PAID'` | `'FULLY_PAID'`

#### 1) `POST /api/v1/expenses` 🔒 — Tạo hóa đơn chia tiền cho phòng đã đóng (`CLOSED`)
*   **Ràng buộc Validation của Backend (`ExpenseService.java`):**
    *   Phòng phải đang ở trạng thái `CLOSED` (`3003 - ROOM_NOT_CLOSED`) và chưa có hóa đơn nào tồn tại (`3004 - EXPENSE_ALREADY_EXISTS`).
    *   `roomId`, `payerId`, `totalAmount` bắt buộc.
    *   `totalAmount > 0` và **bắt buộc bằng tổng `price` của tất cả các phần tử trong `items`** (nếu lệch sẽ trả lỗi `3002 - BILL_AMOUNT_MISMATCH`).
    *   `items` không được rỗng; mỗi phần tử phải có `itemName` và `price > 0`.
    *   `sharerIds` tùy chọn: nếu `null` hoặc rỗng thì mặc định tất cả thành viên trong phòng cùng chia sẻ món đó.
*   **Quy ước Đóng gói Payload từ Frontend theo 2 Chế độ (`splitType`):**
    1.  **Chế độ `EVENLY` (Nhập tổng tiền & chia đều cho tất cả thành viên trong Room):**
        *   Người dùng chỉ nhập duy nhất `totalAmount`. Frontend tự động đóng gói 1 phần tử đại diện:
            `items: [{ "itemName": "Tổng hóa đơn chung", "price": totalAmount, "sharerIds": null }]`.
    2.  **Chế độ `BY_ITEM` (Nhập tay giá tiền từng người):**
        *   Người dùng nhập số tiền cụ thể cho từng thành viên (FE validate tổng tiền các thành viên `=== totalAmount`). Mỗi thành viên có số tiền `> 0` được đóng gói thành 1 phần tử trong `items` với `sharerIds: [userId]`:
            `items: [{ "itemName": "Phần của " + username, "price": userAmount, "sharerIds": [userId] }, ...]`.
*   **Response (`result` — `ExpenseResponse`):**
    ```json
    {
      "id": "7a33f8b5-1da1-482d-a638-b91f7dbc8999",
      "room": {
        "id": "eec45b65-4350-4bfc-b64c-f528ef7f5e67",
        "name": "Nhóm ăn trưa",
        "roomCode": "ABC123",
        "status": "CLOSED"
      },
      "payer": {
        "id": "bc6fd570-fe91-41e2-bdd0-2e38bb499323",
        "username": "alice",
        "bankBin": "970422",
        "bankAccountNumber": "0123456789",
        "bankAccountName": "NGUYEN THI ALICE"
      },
      "totalAmount": 110000,
      "splitType": "EVENLY",
      "status": "UNPAID",
      "createdAt": "2026-10-11T22:00:00",
      "items": [
        {
          "id": "11111111-1da1-482d-a638-b91f7dbc8999",
          "itemName": "Tổng hóa đơn chung",
          "price": 110000,
          "sharerCount": 2,
          "pricePerPerson": 55000
        }
      ],
      "splits": [
        {
          "expenseId": "7a33f8b5-1da1-482d-a638-b91f7dbc8999",
          "user": {
            "id": "9fc1eaba-711f-43a5-b16f-16172e0bee78",
            "username": "bob"
          },
          "payer": {
            "id": "bc6fd570-fe91-41e2-bdd0-2e38bb499323",
            "username": "alice",
            "bankBin": "970422",
            "bankAccountNumber": "0123456789",
            "bankAccountName": "NGUYEN THI ALICE"
          },
          "amountOwed": 55000,
          "paid": false,
          "qrCodeUrl": "https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=55000&addInfo=Tra+tien+an+phong+ABC123&accountName=NGUYEN+THI+ALICE"
        }
      ],
      "fullyPaid": false
    }
    ```

#### 2) `GET /api/v1/expenses/{expenseId}` 🔒 — Lấy chi tiết một hóa đơn
*   **Path Variable:** `expenseId` (`UUID`).
*   **Response (`result`):** `ExpenseResponse` (kèm `qrCodeUrl` trong từng `splits` chưa trả).

#### 3) `GET /api/v1/expenses/room/{roomId}` 🔒 — Lấy danh sách hóa đơn của một phòng
*   **Path Variable:** `roomId` (`UUID`).
*   **Response (`result`):** Mảng `ExpenseResponse[]`.

#### 4) `GET /api/v1/expenses/my-debts` 🔒 — Lấy danh sách khoản nợ chưa thanh toán của tôi
*   **Response (`result` — `ExpenseSplitItem[]` / `ExpenseSplitResponse[]`):**
    ```json
    [
      {
        "expenseId": "7a33f8b5-1da1-482d-a638-b91f7dbc8999",
        "user": {
          "id": "9fc1eaba-711f-43a5-b16f-16172e0bee78",
          "username": "bob"
        },
        "payer": {
          "id": "bc6fd570-fe91-41e2-bdd0-2e38bb499323",
          "username": "alice",
          "bankBin": "970422",
          "bankAccountNumber": "0123456789",
          "bankAccountName": "NGUYEN THI ALICE"
        },
        "amountOwed": 55000,
        "paid": false,
        "qrCodeUrl": "https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=55000&addInfo=Tra+tien+an+phong+ABC123&accountName=NGUYEN+THI+ALICE"
      }
    ]
    ```

#### 5) `PATCH /api/v1/expenses/{expenseId}/splits/{userId}/pay` 🔒 — Xác nhận 1 thành viên đã trả nợ
*   **Path Variables:** `expenseId` (`UUID`), `userId` (`UUID`).
*   **Quyền hạn:** Chỉ `Payer` (Chủ nợ) hoặc chính `userId` đó mới được gọi. Tự động cập nhật `status` của hóa đơn sang `PARTIALLY_PAID` hoặc `FULLY_PAID`.
*   **Response (`result`):** `ExpenseSplitItem` với `"paid": true`, `"qrCodeUrl": null`.

#### 6) `PATCH /api/v1/expenses/{expenseId}/pay-all` 🔒 — Đánh dấu toàn bộ hóa đơn đã thanh toán
*   **Path Variable:** `expenseId` (`UUID`).
*   **Quyền hạn:** Chỉ `Payer` mới được gọi (`3007 - NOT_EXPENSE_PAYER`).
*   **Response (`result`):** `ExpenseResponse` với `"status": "FULLY_PAID"`, `"fullyPaid": true`.

#### 7) `DELETE /api/v1/expenses/{expenseId}` 🔒 — Xóa hóa đơn
*   **Path Variable:** `expenseId` (`UUID`).
*   **Ràng buộc:** Chỉ `Payer` hoặc `Host` của phòng mới được xóa, **và** hóa đơn phải đang ở trạng thái `UNPAID` (nếu `PARTIALLY_PAID` hoặc `FULLY_PAID` sẽ bị chặn bởi mã lỗi `4002 - CANNOT_DELETE_PAID_EXPENSE`).
*   **Response (`result`):** `"Đã xóa hóa đơn thành công"`.

---

## 3. Trạng Thái Hợp Đồng Realtime (WebSocket / STOMP) — `[PENDING_BACKEND]`

> [!IMPORTANT]
> Kiểm tra thực tế `BE/pom.xml` và mã nguồn `BE/`: Backend **chưa cài đặt `spring-boot-starter-websocket`** và chưa có bất kỳ cấu hình STOMP nào. Toàn bộ luồng Phòng ăn (`Rooms`) và Quẹt thẻ (`Swipes`) đang vận hành 100% qua **RESTful API** (`POST /api/v1/rooms/*`, `POST/GET /api/v1/rooms/{roomId}/deck` và `POST /api/v1/swipes/*`).

*   **Quy tắc chuẩn hóa trên Frontend (`[CONFIRMED]`):**
    1.  **Sử dụng REST API + REST Polling làm cơ chế đồng bộ chính:** Mọi thao tác tạo phòng, tham gia phòng, lấy bộ bài (`/deck`), bắt đầu phiên quẹt (`/start`), gửi lượt quẹt (`/swipes`), xem kết quả (`/results`) và chốt quán (`/select-place`) **bắt buộc gọi qua REST API**. Tại màn hình phòng chờ (`Lobby.tsx`) và quẹt thẻ (`Swipe.tsx`), thực hiện polling định kỳ (`3000ms–4000ms`) tới `GET /api/v1/rooms/{roomId}` để đồng bộ danh sách thành viên và trạng thái phòng.
    2.  **Cô lập `socketClient.ts` & `useSocket.ts` (`[PENDING_BACKEND]`):** Khi Backend mở kênh WebSocket trong tương lai, mọi bản tin JSON gửi/nhận qua STOMP bắt buộc tuân thủ đúng mô hình DTO `camelCase` (`roomId`, `userId`, `placeId`, `liked`, `matchedPlace`).

---

## 4. Bảng Mã Lỗi Tập Trung Chính Thức (Đối Chiếu 100% Từ `ErrorCode.java` & `SecurityConfig.java`)

Khi xảy ra lỗi, Backend trả về cấu trúc `{ "code": <number>, "message": "<string>" }`:

### 4.1. Nhóm Lỗi Hệ Thống, Xác Thực, Validation, Địa Điểm, Tag & Kết Bạn (`10xx`–`13xx` & `9999`)

| Mã Code | HTTP Status | Tên Enum (`ErrorCode.java`) | Thông Điệp Mặc Định Từ Backend & Cách Xử Lý Trên Frontend |
| :--- | :--- | :--- | :--- |
| `1000` | `200 OK` | `SUCCESS` | Thành công. |
| `9999` | `500 INTERNAL_SERVER_ERROR` | `UNCATEGORIZED_EXCEPTION` | `"Lỗi hệ thống không xác định"` $\rightarrow$ Hiển thị `Toast` (`type="danger"`). |
| `1001` | `400 BAD_REQUEST` | `INVALID_KEY` | `"Mã lỗi không hợp lệ"` (Lỗi validation field không khớp enum) $\rightarrow$ Hiển thị lỗi dưới Form. |
| `1002` | `401 UNAUTHORIZED` | `UNAUTHENTICATED` | `"Chưa đăng nhập hoặc phiên làm việc hết hạn"` (từ `JwtAuthenticationEntryPoint` hoặc Service) $\rightarrow$ Xóa phiên (`resetSessionAndStores`) và chuyển về `/login`. |
| `1003` | `403 FORBIDDEN` | `UNAUTHORIZED` | `"Bạn không có quyền thực hiện thao tác này"` (từ `JwtAccessDeniedHandler` hoặc Service) $\rightarrow$ Hiển thị `Toast` (`type="danger"`) hoặc `Alert`. |
| `1004` | `404 NOT_FOUND` | `USER_NOT_EXISTED` | `"Người dùng không tồn tại"`. |
| `1005` | `400 BAD_REQUEST` | `USER_EXISTED` | `"Tên đăng nhập hoặc email đã tồn tại"` (Trùng `username` hoặc `email` khi đăng ký/cập nhật). |
| `1006` | `401 UNAUTHORIZED` | `LOGIN_FAILED` | `"Tài khoản hoặc mật khẩu không chính xác"` $\rightarrow$ Hiển thị lỗi trên `LoginForm` (không tự redirect). |
| `1007` | `400 BAD_REQUEST` | `CANNOT_DELETE_ADMIN` | `"Không thể xóa tài khoản Admin hệ thống"`. |
| `1008` | `400 BAD_REQUEST` | `CANNOT_ASSIGN_ADMIN_ROLE` | `"Không được phép tạo hoặc phân quyền Admin cho tài khoản khác"`. |
| `1009` | `400 BAD_REQUEST` | `INVALID_OTP` | `"Mã OTP không hợp lệ hoặc đã hết hạn"`. |
| `1101` | `400 BAD_REQUEST` | `USERNAME_INVALID` | `"Tên đăng nhập phải có ít nhất 3 ký tự"`. |
| `1102` | `400 BAD_REQUEST` | `PASSWORD_INVALID` | `"Mật khẩu phải có ít nhất 6 ký tự"`. |
| `1103` | `400 BAD_REQUEST` | `EMAIL_INVALID` | `"Email không đúng định dạng"`. |
| `1104` | `400 BAD_REQUEST` | `INVALID_ROLE` | `"Quyền người dùng không hợp lệ"`. |
| `1201` | `404 NOT_FOUND` | `PLACE_NOT_FOUND` | `"Địa điểm không tồn tại"`. |
| `1202` | `400 BAD_REQUEST` | `PLACE_NAME_INVALID` | `"Tên địa điểm không được để trống"`. |
| `1203` | `400 BAD_REQUEST` | `PLACE_LATITUDE_INVALID` | `"Vĩ độ không hợp lệ"`. |
| `1204` | `400 BAD_REQUEST` | `PLACE_LONGITUDE_INVALID` | `"Kinh độ không hợp lệ"`. |
| `1205` | `400 BAD_REQUEST` | `PLACE_NOT_IN_ROOM_DECK` | `"Quán ăn này không nằm trong bộ bài quẹt của phòng"`. |
| `1206` | `400 BAD_REQUEST` | `NO_PLACES_NEARBY` | `"Không tìm thấy đủ quán ăn trong khu vực này. Vui lòng tăng bán kính tìm kiếm."`. |
| `1301` | `400 BAD_REQUEST` | `FRIENDSHIP_ALREADY_EXISTS` | `"Yêu cầu kết bạn hoặc quan hệ bạn bè đã tồn tại"`. |
| `1302` | `404 NOT_FOUND` | `FRIENDSHIP_NOT_FOUND` | `"Không tìm thấy quan hệ bạn bè"`. |
| `1303` | `400 BAD_REQUEST` | `CANNOT_FRIEND_SELF` | `"Không thể kết bạn với chính mình"`. |
| `1304` | `400 BAD_REQUEST` | `TAG_ALREADY_EXISTS` | `"Tag đã tồn tại"`. |
| `1305` | `404 NOT_FOUND` | `TAG_NOT_FOUND` | `"Tag không tồn tại"`. |
| `1306` | `400 BAD_REQUEST` | `CANNOT_BLOCK_SELF` | `"Không thể chặn chính mình"`. |
| `1307` | `400 BAD_REQUEST` | `CANNOT_FRIEND_ADMIN` | `"Không thể gửi lời mời kết bạn cho Quản trị viên"`. |

### 4.2. Nhóm Lỗi Phòng Ăn & Quẹt Thẻ (`20xx`)

| Mã Code | HTTP Status | Tên Enum (`ErrorCode.java`) | Thông Điệp Mặc Định Từ Backend & Cách Xử Lý Trên Frontend |
| :--- | :--- | :--- | :--- |
| `2001` | `404 NOT_FOUND` | `ROOM_NOT_FOUND` | `"Không tìm thấy phòng ăn"` $\rightarrow$ Hiển thị `Toast` và chuyển về `/app/room`. |
| `2002` | `400 BAD_REQUEST` | `ROOM_FULL` | `"Phòng ăn đã đủ số lượng thành viên"`. |
| `2003` | `400 BAD_REQUEST` | `ROOM_CLOSED` | `"Phòng ăn này đã đóng hoặc đã chốt đơn"`. |
| `2004` | `403 FORBIDDEN` | `NOT_ROOM_HOST` | `"Chỉ có chủ phòng mới có quyền thao tác này"`. |
| `2005` | `400 BAD_REQUEST` | `ROOM_NOT_OPEN` | `"Phòng này không còn mở để tham gia"`. |
| `2006` | `400 BAD_REQUEST` | `USER_ALREADY_IN_ROOM` | `"Bạn đã ở trong phòng này rồi"`. |
| `2007` | `403 FORBIDDEN` | `NOT_ROOM_MEMBER` | `"Bạn không phải là thành viên trong phòng này"` $\rightarrow$ Chuyển về `/app/room`. |
| `2008` | `400 BAD_REQUEST` | `ROOM_NOT_SWIPING` | `"Phòng này chưa bắt đầu hoặc đã kết thúc quẹt"`. |
| `2009` | `429 TOO_MANY_REQUESTS` | `ROOM_BUSY` | `"Phòng ăn đang bận xử lý lượt quẹt, vui lòng thử lại sau"`. |
| `2010` | `400 BAD_REQUEST` | `CANNOT_KICK_SELF` | `"Trưởng phòng không thể tự xóa chính mình ra khỏi phòng"`. |
| `2011` | `400 BAD_REQUEST` | `ROOM_ALREADY_CLOSED` | `"Phòng ăn đã đóng trước đó"`. |
| `2012` | `400 BAD_REQUEST` | `ROOM_LOCATION_NOT_SET` | `"Phòng ăn chưa được thiết lập tọa độ vị trí"`. |
| `2013` | `400 BAD_REQUEST` | `CANNOT_CHANGE_PLACE_AFTER_EXPENSE` | `"Không thể thay đổi quán ăn vì phòng đã tạo hóa đơn chia tiền"`. |
| `2014` | `400 BAD_REQUEST` | `ALREADY_SWIPED` | `"Bạn đã quẹt địa điểm này rồi"` $\rightarrow$ Tự động chuyển sang thẻ tiếp theo. |

### 4.3. Nhóm Lỗi Chia Tiền Hóa Đơn & Dịch Vụ Bên Ngoài (`30xx` & `40xx`)

| Mã Code | HTTP Status | Tên Enum (`ErrorCode.java`) | Thông Điệp Mặc Định Từ Backend & Cách Xử Lý Trên Frontend |
| :--- | :--- | :--- | :--- |
| `3001` | `404 NOT_FOUND` | `EXPENSE_NOT_FOUND` | `"Không tìm thấy hóa đơn"`. |
| `3002` | `400 BAD_REQUEST` | `BILL_AMOUNT_MISMATCH` | `"Tổng số tiền các cá nhân chia không khớp với Tổng hóa đơn"`. |
| `3003` | `400 BAD_REQUEST` | `ROOM_NOT_CLOSED` | `"Phòng ăn phải ở trạng thái CLOSED mới có thể tạo hóa đơn"`. |
| `3004` | `400 BAD_REQUEST` | `EXPENSE_ALREADY_EXISTS` | `"Phòng này đã có hóa đơn được tạo rồi"`. |
| `3005` | `404 NOT_FOUND` | `SPLIT_NOT_FOUND` | `"Không tìm thấy khoản chia tiền này"`. |
| `3006` | `400 BAD_REQUEST` | `ALREADY_PAID` | `"Khoản tiền này đã được thanh toán trước đó"`. |
| `3007` | `403 FORBIDDEN` | `NOT_EXPENSE_PAYER` | `"Chỉ người trả tiền mới có thể thực hiện thao tác này"`. |
| `3008` | `400 BAD_REQUEST` | `INVALID_SPLIT_TYPE` | `"Kiểu chia tiền không hợp lệ, chỉ chấp nhận EVENLY hoặc BY_ITEM"`. |
| `3009` | `400 BAD_REQUEST` | `SHARER_NOT_IN_ROOM` | `"Người chia sẻ món ăn phải là thành viên trong phòng"`. |
| `3010` | `400 BAD_REQUEST` | `PAYER_NOT_IN_ROOM` | `"Người thanh toán phải là thành viên trong phòng ăn"`. |
| `4001` | `503 SERVICE_UNAVAILABLE` | `EXTERNAL_SERVICE_ERROR` | `"Dịch vụ bên thứ ba (Google Maps/VietQR) gặp sự cố"`. |
| `4002` | `400 BAD_REQUEST` | `CANNOT_DELETE_PAID_EXPENSE` | `"Hóa đơn đã có thành viên thanh toán, không thể xóa"`. |

---

## 5. Chuẩn TypeScript Interfaces (`src/types/api.ts`)

Mọi **Skill** khi sinh code TypeScript cho Frontend phải import hoặc tuân thủ chính xác bộ Interfaces dưới đây (khớp 100% với tất cả DTO Request/Response trong `BE/`):

```typescript
export interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type Role = 'ROLE_GUEST' | 'ROLE_USER' | 'ROLE_ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'SUSPENDED';
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED' | 'DECLINED';
export type RoomStatus = 'OPEN' | 'SWIPING' | 'CLOSED';
export type SplitType = 'EVENLY' | 'BY_ITEM';
export type ExpenseStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';

/* ==================== 1. AUTH ==================== */
export interface AuthenticationRequest {
  username: string;
  password: string;
}

export interface AuthenticationResponse {
  token: string;
  authenticated: boolean;
}

export interface IntrospectRequest {
  token: string;
}

export interface IntrospectResponse {
  valid: boolean;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

/* ==================== 2. USERS ==================== */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string | null;
}

export interface UpdateUserRequest {
  password?: string;
  email?: string;
  avatarUrl?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  roles?: string[];
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  status: UserStatus;
  createdAt: string;
  roles: string[]; // Chứa "ROLE_USER" / "USER" hoặc "ROLE_ADMIN" / "ADMIN"
}

/* ==================== 3. PLACES ==================== */
export interface CreatePlaceRequest {
  name: string;
  category?: string | null;
  priceRange?: 1 | 2 | 3 | null;
  imageUrl?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
}

export type UpdatePlaceRequest = Partial<CreatePlaceRequest>;

export interface PlaceFilterParams {
  name?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PlaceResponse {
  id: string;
  name: string;
  category: string | null;
  priceRange: 1 | 2 | 3 | null;
  imageUrl: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
}

/* ==================== 4. TAGS ==================== */
export interface TagRequest {
  tagName: string;
}

export interface TagResponse {
  id: string;
  tagName: string;
}

export interface UserTagResponse {
  tag: TagResponse;
  temporary: boolean;
}

/* ==================== 5. FRIENDSHIPS ==================== */
export interface FriendshipResponse {
  requester: UserResponse;
  addressee: UserResponse;
  status: FriendshipStatus;
  createdAt: string;
}

/* ==================== 6. ROOMS ==================== */
export interface CreateRoomRequest {
  name?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  deckSize?: number;
}

export interface SelectPlaceRequest {
  placeId: string;
}

export interface RoomResponse {
  id: string;
  name: string | null;
  roomCode: string;
  host: UserResponse;
  status: RoomStatus;
  matchedPlace: PlaceResponse | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  deckSize: number | null;
  createdAt: string;
  members?: UserResponse[] | null;
}

/* ==================== 7. SWIPES ==================== */
export interface SwipeRequest {
  roomId: string;
  placeId: string;
  liked: boolean;
}

export interface UserSwipeHistoryItem {
  placeId: string;
  placeName: string;
  liked: boolean;
}

export interface RoomSwipeResultItem {
  placeId: string;
  placeName: string;
  totalLikes: number;
  totalDislikes: number;
  matched: boolean;
}

/* ==================== 8. EXPENSES ==================== */
export interface ExpenseItemRequest {
  itemName: string;
  price: number;
  sharerIds?: string[] | null;
}

export interface CreateExpenseRequest {
  roomId: string;
  payerId: string;
  totalAmount: number;
  splitType: SplitType;
  items: ExpenseItemRequest[];
}

export interface ExpenseItemResponse {
  id: string;
  itemName: string;
  price: number;
  sharerCount: number;
  pricePerPerson: number;
}

export interface ExpenseSplitItem {
  expenseId: string;
  user: UserResponse;
  payer?: UserResponse | null;
  amountOwed: number;
  paid: boolean;
  qrCodeUrl?: string | null;
}

export interface ExpenseResponse {
  id: string;
  room: RoomResponse;
  payer: UserResponse;
  totalAmount: number;
  splitType: SplitType;
  status: ExpenseStatus;
  createdAt: string;
  items: ExpenseItemResponse[];
  splits: ExpenseSplitItem[];
  fullyPaid: boolean;
}
```

---

## 6. Tổng Hợp Trạng Thái Các Hạng Mục Tích Hợp So Với `BE/` Hiện Tại

1.  **Xác thực mở rộng (`/verify`, `/forgot-password`, `/reset-password` — `[CONFIRMED_CONTRACT]`):** `BE/` đã có đủ 4 API `POST /api/v1/auth/send-otp`, `/verify-otp`, `/forgot-password`, `/reset-password` tại `AuthenticationController.java`. Lưu ý xử lý trường hợp `SecurityConfig.java` trả về `401 (1002)` khi chưa mở `PUBLIC_ENDPOINTS`.
2.  **Định danh khi Đăng nhập (`username` — `[CONFIRMED]`):** `POST /api/v1/auth/token` trong `AuthenticationService.java` chỉ tra cứu qua `findByUsername`. Sau khi đăng nhập, gọi `GET /api/v1/users/me` để lấy `UserResponse` của người dùng hiện tại.
3.  **Danh sách Thành viên & Bộ bài của Phòng (`[CONFIRMED]`):** `GET /api/v1/rooms/{roomId}` trả về đầy đủ `members: UserResponse[]`, `latitude`, `longitude`, `radius`, `deckSize`. Bộ bài của phòng được lấy qua `POST /api/v1/rooms/{roomId}/deck` và `GET /api/v1/rooms/{roomId}/deck`.
4.  **Thông tin Ngân hàng & Mã VietQR (`[CONFIRMED]`):** `UserResponse` và `UpdateUserRequest` đã có `bankBin`, `bankAccountNumber`, `bankAccountName`. `ExpenseSplitResponse` đã có sẵn `qrCodeUrl` và `payer` do `VietQRHelper.java` tự động sinh.
5.  **Ghép hội ngẫu nhiên (`/app/room/match` & `/app/room/queue` — `[PENDING_BACKEND]`):** `BE/` chỉ có API gắn Tag cá nhân kèm cờ tạm thời (`POST /api/v1/tags/user/me/{tagId}?temporary=true`), chưa có API vào/rời hàng đợi ghép phòng tự động.
6.  **Hợp đồng WebSocket / STOMP (`[PENDING_BACKEND]`):** Chưa có trong `BE/pom.xml`. Mọi luồng phòng ăn và quẹt thẻ hoạt động đầy đủ qua REST API và REST Polling.

---

## 7. Quy Tắc Chuẩn Mực Cho Skill Khi Tích Hợp API

1.  **Tuân thủ tuyệt đối URL & HTTP Method của `BE/`:** Luôn đối chiếu chính xác đường dẫn khi tạo các file trong `src/services/*.service.ts` (đặc biệt lưu ý: `GET /api/v1/users/me`, `POST /api/v1/rooms/{roomId}/deck`, `GET /api/v1/rooms/{roomId}/deck`, `POST /api/v1/tags/user/me/{tagId}`, `GET /api/v1/friendships/requests/incoming`, `PUT /api/v1/friendships/requests/{requesterId}/accept`, `GET /api/v1/rooms/my-rooms`, `GET /api/v1/swipes/rooms/{roomId}/me`, `GET /api/v1/swipes/rooms/{roomId}/results`, `GET /api/v1/expenses/room/{roomId}`, `GET /api/v1/expenses/my-debts`, `PATCH /api/v1/expenses/{expenseId}/splits/{userId}/pay`, `PATCH /api/v1/expenses/{expenseId}/pay-all`).
2.  **Đồng nhất 100% `camelCase` từ API xuống Dumb Components:** Toàn bộ dữ liệu nhận từ `BE/` (`PlaceResponse`, `UserResponse`, `RoomResponse`, `ExpenseResponse`) giữ nguyên tên trường `camelCase` (`priceRange`, `imageUrl`, `avatarUrl`, `roomCode`, `amountOwed`, `paid`, `qrCodeUrl`) khi truyền vào Dumb Components (như `PlaceCard`, `ListItem`, `QRCodeDisplay`), không chuyển đổi sang `snake_case`.
3.  **Tự động hóa xử lý lỗi qua Interceptor (`src/services/apiClient.ts`):** Mọi lỗi có **HTTP status `401 Unauthorized`** (mã `1002 - UNAUTHENTICATED`, ngoại trừ `/api/v1/auth/token` trả `1006 - LOGIN_FAILED` hoặc các trang `/verify`, `/forgot-password`, `/reset-password`) phải tự động xóa phiên (`resetSessionAndStores`) và điều hướng về `/login`; các lỗi nghiệp vụ khác (`1001`–`1009`, `1101`–`1104`, `1201`–`1206`, `1301`–`1307`, `2001`–`2014`, `3001`–`3010`, `4001`–`4002`, `9999`) hiển thị `message` từ Backend thông qua `Toast` (`type="danger"`) hoặc `Alert`.
