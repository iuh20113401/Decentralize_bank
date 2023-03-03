import { Tabs, Tab } from 'react-bootstrap'
import dBank from '../abis/dBank.json'
import React, { Component } from 'react';
import Token from '../abis/Token.json'
import dbank from '../dbank.png';
import Web3 from 'web3';
import './App.css';

class App extends Component {
  // Được gọi ngay trước khi quá trình cài đặt diễn ra và trước Component#render. Tránh giới thiệu bất kỳ tác dụng phụ hoặc đăng ký nào trong phương pháp này.
  async componentWillMount() {
    // set up tài khoản trước khi hiện ra giao diện
    await this.loadBlockchainData(this.props.dispatch)
  }

  async loadBlockchainData(dispatch) {
    // Kiểm tra xem có ví metaMask hay chưa
    // Nếu chưa thì hiện thông báo "Install MetaMask"
    if(typeof window.ethereum !== 'undefined'){
      // nếu có thì kết nối web3 với môi trường ethereum
      const web3 = new Web3(window.ethereum)
      // dùng để lấy networkId mà tài khoản đang kết nối tới
      const netId = await web3.eth.net.getId()
      // lấy các danh sách tài khoản đang kết nối
      const accounts = await web3.eth.getAccounts()
      // kiểm tra xem có kết nối với metaMask chưa 
      // Nếu chưa thì thông báo 'Please login with metaMask'
      if(typeof accounts[0] !== 'undefined'){
              // lấy số dư tài khoản đang có trên metaMask
        const balance = await web3.eth.getBalance(accounts[0])
        this.setState({account: accounts[0], balance: balance, web3: web3})
      } else {
        window.alert('Please login with MetaMask')
      }
      // khai báo các contract 
      try {
        const token = new web3.eth.Contract(Token.abi, Token.networks[netId].address)
        const dbank = new web3.eth.Contract(dBank.abi, dBank.networks[netId].address)
        const dBankAddress = dBank.networks[netId].address
        this.setState({token: token, dbank: dbank, dBankAddress: dBankAddress})
      } catch (e) {
        console.log('Error', e)
        window.alert('Contracts not deployed to the current network')
      }
    } else {
      window.alert('Please install MetaMask')
    }
  }
  // hàm dùng để khai báo số lượng ether gửi
  async deposit(amount) {
    if(this.state.dbank!=='undefined'){
      try{
        // dùng để lấy ether từ account đang liên kết vào tiền gửi
        await this.state.dbank.methods.deposit().send({value: amount.toString(), from: this.state.account})
      } catch (e) {
        // báo lỗi nếu việc lấy giá trị bị lỗi
        console.log('Error, deposit: ', e)
      }
    }
  }
  // hàm dùng để khai báo sự kiện rút ether khỏi ngân hàng
  async withdraw(e) {
    //ngăn chặn trình duyệt chuyển tiếp đến trang khác hoặc tải lại trang web khi người dùng nhấn vào nút submit trong một biểu mẫu.
    e.preventDefault()
    // nếu mà dbank đã được kết nối thì thực hiện việc rút tiền 
    // Còn không thì không hiển thị gì và in lỗi trong console
    if(this.state.dbank!=='undefined'){
      try{
        await this.state.dbank.methods.withdraw().send({from: this.state.account})
      } catch(e) {
        console.log('Error, withdraw: ', e)
      }
    }
  }
  // khai báo hàm borrow dùng để mượn token từ ngân hàng với số lượng mà người dùng nhập 
  async borrow(amount) {
    // nếu mà dbank đã được kết nối thì thực hiện việc mươn token 
    // Còn không thì không hiển thị gì và in lỗi trong console
    if(this.state.dbank!=='undefined'){
      try{
        // gọi phương thức borrow() trong dbank.sol và thực hiện việc chuyển tiền cho tài khoản bằng phương thức send
        await this.state.dbank.methods.borrow().send({value: amount.toString(), from: this.state.account})
        } catch (e) {
        console.log('Error, borrow: ', e)
      }
    }
  }
// khai báo hàm borrow dùng để trả nợ token cho ngân hàng và ngân hàng gửi lại ether cho người gủi
  async payOff(e) {
    e.preventDefault()
    // nếu mà dbank đã được kết nối thì thực hiện việc trả nợ token 
    // Còn không thì không hiển thị gì và in lỗi trong console
    if(this.state.dbank!=='undefined'){
      try{
        // lấy số tiền đã thế chấp của tài khoản và lưu vào biến collateralEther qua hàm call()
        const collateralEther = await this.state.dbank.methods.collateralEther(this.state.account).call({from: this.state.account})
        // tính số tiền đã mượn bằng tiền thế chấp chia 2
        const tokenBorrowed = collateralEther/2
        // cấp quyền cho người dùng trả lại token đã mươn
        await this.state.token.methods.approve(this.state.dBankAddress, tokenBorrowed.toString()).send({from: this.state.account})
        // Sau đó trả lại cho người dùng tiền đã thế chấp
        await this.state.dbank.methods.payOff().send({from: this.state.account})
      } catch(e) {
        console.log('Error, pay off: ', e)
      }
    }
  }
  // khai báo hàm khởi tạo khi chạy chương trình với biến this.state sẽ lưu giữ các thông tin của tài khoản đang kết nối
  constructor(props) {
    super(props)
    this.state = {
      web3: 'undefined',
      account: '',
      token: null,
      dbank: null,
      balance: 0,
      dBankAddress: null
    }
  }
  // dùng để tạo giao diện website 
  render() {
    return (
      <div className='text-monospace'>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
        <img src={dbank} className="App-logo" alt="logo" height="32"/>
          <b>d₿ank</b>
        </a>
        </nav>
        <div className="container-fluid mt-5 text-center">
        <br></br>
          <h1>Welcome to d₿ank</h1>
          <h2>{this.state.account}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
              <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                {/* chức năng deposit */}
                <Tab eventKey="deposit" title="Deposit">
                  <div>
                  <br></br>
                    How much do you want to deposit?
                    <br></br>
                    (min. amount is 0.01 ETH)
                    <br></br>
                    (1 deposit is possible at the time)
                    <br></br>
                    {/* khi người dùng nhập vào số lượng và nhấn nút submit \ */}
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      // lấy số lượng ether mà người dùng muốn gửi
                      let amount = this.depositAmount.value
                      // đổi ra giá trị wei 
                      amount = amount * 10**18 //convert to wei
                      // gọi hàm deposit với số lượng đó
                      this.deposit(amount)
                    }}>
                      {/* tạo form cho người dùng nhạp số lượng */}
                      <div className='form-group mr-sm-2'>
                      <br></br>
                        <input
                          id='depositAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.depositAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />
                      </div>
                      <button type='submit' className='btn btn-primary'>DEPOSIT</button>
                    </form>

                  </div>
                </Tab>
                {/* Chức năng withdraw */}
                <Tab eventKey="withdraw" title="Withdraw">
                  <br></br>
                    Do you want to withdraw + take interest?
                    <br></br>
                    <br></br>
                  <div>
                    {/* tương tự như trên khi người dùng nhấn nút withdraw sẽ thực hiện hàm withdraw */}
                    <button type='submit' className='btn btn-primary' onClick={(e) => this.withdraw(e)}>WITHDRAW</button>
                  </div>
                </Tab>
                {/* chức năng mượn toekn */}
                <Tab eventKey="borrow" title="Borrow">
                  <div>
                  <br></br>
                    Do you want to borrow tokens?
                    <br></br>
                    (You'll get 50% of collateral, in Tokens)
                    <br></br>
                    Type collateral amount (in ETH)
                    <br></br>
                    <br></br>
                    {/* tương tự như trên sau khi người dùng nhập số lượng cần mượn và nhấn nút mượn sẽ thực hiện các tác vụ sau */}
                    <form onSubmit={(e) => {

                      e.preventDefault()
                      // lấy số lượng toke mà người dùng muốn mươn 
                      let amount = this.borrowAmount.value
                      // chuyển nó ra wei 
                      amount = amount * 10 **18 //convert to wei
                      // Thực hiện chúc năng borrow bằng cách gọi hàm borrow với tham số đầu vào là số lượng
                      this.borrow(amount)
                    }}>
                      {/* tạo form cho người dùng nhập số tiền muốn mượn và nút mượn */}
                      <div className='form-group mr-sm-2'>
                        <input
                          id='borrowAmount'
                          step="0.01"
                          type='number'
                          ref={(input) => { this.borrowAmount = input }}
                          className="form-control form-control-md"
                          placeholder='amount...'
                          required />
                      </div>
                      <button type='submit' className='btn btn-primary'>BORROW</button>
                    </form>
                  </div>
                </Tab>
                {/* tương tự khi người dùng chọn vào chức năng PayOff sẽ hiện ra hộp thoại payOff */}
                <Tab eventKey="payOff" title="Payoff">
                  <div>

                  <br></br>
                    Do you want to payoff the loan?
                    <br></br>
                    (You'll receive your collateral - fee)
                    <br></br>
                    <br></br>
                    {/* khi người dùng nhấn nút payOff sẽ gọi hàm Payoff ở trên */}
                    <button type='submit' className='btn btn-primary' onClick={(e) => this.payOff(e)}>PAYOFF</button>
                  </div>
                </Tab>
              </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
