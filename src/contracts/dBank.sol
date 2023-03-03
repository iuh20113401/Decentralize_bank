// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
//giống import trong python
import "./Token.sol";

// tạo ra Smart contract tên là dBank
contract dBank {

  // Tạo ra một biến private có kiểu Token
  Token private token;
  // Tạo ra một biến để lưu trữ thời gian với từng địa chỉ cụ thể
  mapping(address => uint) public depositStart;
  // Tạo ra một biến để lưu trữ tiền gửi với từng địa chỉ cụ thể
  mapping(address => uint) public etherBalanceOf;
  // Tạo ra một biến để lưu trữ tiền thế chấp với từng địa chỉ cụ thể
  mapping(address => uint) public collateralEther;
  // Tạo ra một biến để lưu trữ trạng thái gửi tiền với từng địa chỉ cụ thể
  mapping(address => bool) public isDeposited;
  // Tạo ra một biến để lưu trữ trạng thái mượn tiền với từng địa chỉ cụ thể
  mapping(address => bool) public isBorrowed;
  // dùng để khai báo rằng sẽ lưu trữ thông tin tiền gửi vào nhật ký giao dịch
  event Deposit(address indexed user, uint etherAmount, uint timeStart);
  // dùng để khai báo rằng sẽ lưu trữ thông tin rút tiền vào nhật ký giao dịch
  event Withdraw(address indexed user, uint etherAmount, uint depositTime, uint interest);
  // dùng để khai báo rằng sẽ lưu trữ thông tin mượn tiền vào nhật ký giao dịch
  event Borrow(address indexed user, uint collateralEtherAmount, uint borrowedTokenAmount);
  // dùng để khai báo rằng sẽ lưu trữ thông tin trả tiền nợ vào nhật ký giao dịch
  event PayOff(address indexed user, uint fee);

  constructor(Token _token) public {
    token = _token;
  }
// Khai báo một hàm dùng để gửi tiền gủi
  function deposit() payable public {
    // Yêu cầu chỉ được gủi 1 lần 1 lúc
    require(isDeposited[msg.sender] == false, 'Error, deposit already active');
    // Yêu cầu giá trị gửi phải lớn hơn 0.01 ETH nếu không sẽ báo lỗi
    require(msg.value>=1e16, 'Error, deposit must be >= 0.01 ETH');
    //tạo ra biến lưu trữ số tiền gửi của người gửi
    etherBalanceOf[msg.sender] = etherBalanceOf[msg.sender] + msg.value;
    // ghi lại thời gian gửi tiền
    depositStart[msg.sender] = depositStart[msg.sender] + block.timestamp;
    // kích hoạt trạng thái gửi tiền
    isDeposited[msg.sender] = true; //activate deposit status
    // Ghi lại thông tin gửi tiền của khách hàng
    emit Deposit(msg.sender, msg.value, block.timestamp);
  }
// khai báo một hàm dùng để rút tiền cộng với tiền lãi
  function withdraw() public {
    // kiểm tra trạng thái gửi tiền nếu không có tiền gửi thì báo lỗi
    require(isDeposited[msg.sender]==true, 'Error, no previous deposit');
    // khai báo một biến dùng để lưu trữ tiền gửi của người gửi
    uint userBalance = etherBalanceOf[msg.sender]; //for event

    //kiểm tra thời gian gửi
    uint depositTime = block.timestamp - depositStart[msg.sender];

    //tính lãi suất 10% năm
    uint interestPerSecond = 366666 * (etherBalanceOf[msg.sender] / 1e16);
    uint interest = interestPerSecond * depositTime;
    //gủi lại tiền cho người gửi cộng với lãi 
    msg.sender.transfer(etherBalanceOf[msg.sender]); //eth back to user
    token.mint(msg.sender, interest); //interest to user

    //đặt lại trạng thái cho người gửi 
    depositStart[msg.sender] = 0;// thời gian gửi bằng 0
    etherBalanceOf[msg.sender] = 0;// tiền gửi bằng 0
    isDeposited[msg.sender] = false;// trạng thái gửi tiền 0

    // lưu trữ thông tin rút tiềnf1e92c3fbfd3acba7dbc238ac3920cfecd5592dbcf9be371aa19298afe5b1002

    emit Withdraw(msg.sender, userBalance, depositTime, interest);
  }
// hàm  mượn tiền
  function borrow() payable public {
    require(msg.value>=1e16, 'Error, collateral must be >= 0.01 ETH');
    // yêu cầu là chưa mượn lần nào
    require(isBorrowed[msg.sender] == false, 'Error, loan already taken');

    //tạo ra một biến thế chấp  ether và sẽ không thể lấy lại cho tới khi trả nợ
    collateralEther[msg.sender] = collateralEther[msg.sender] + msg.value;

    //tạo ra một biến lưu trữ giá trị cho mượn đồng token
    uint tokensToMint = collateralEther[msg.sender] / 2;

    //đào và gửi token lại cho người gửi
    token.mint(msg.sender, tokensToMint);

    //trạng thái mượn tiền được đặt là true
    isBorrowed[msg.sender] = true;
    // Các thông tin cho mượn được ghi lại trong nhật ký giao dich
    emit Borrow(msg.sender, collateralEther[msg.sender], tokensToMint);
  }
// khởi tạo hàm dùng để trả nợ
  function payOff() public {
    // Yêu cầu là người trả nợ phải có nợ để trả không là báo lỗi
    require(isBorrowed[msg.sender] == true, 'Error, loan not active');

    require(token.transferFrom(msg.sender, address(this), collateralEther[msg.sender]/2), "Error, can't receive tokens"); //must approve dBank 1st
    // khởi tạo hàm tính phí 10% dựa trên số tiền thế chấp 
    uint fee = collateralEther[msg.sender]/10; //calc 10% fee

    //gửi lại cho người nhận số tiền thế chấp đã trừ phí
    msg.sender.transfer(collateralEther[msg.sender]-fee);

    //đặt lại trạng thái mươn
    collateralEther[msg.sender] = 0; // thế chấp bằng 0
    isBorrowed[msg.sender] = false;//
    emit PayOff(msg.sender, fee);
  }
  // Khai báo một hàm dùng để gửi ether đến địa chỉ khác
}
