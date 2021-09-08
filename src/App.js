import './App.css';
import {useEffect, useState} from "react";
import mqtt from 'mqtt'
import {Button, Card, Avatar, Modal, Space, Row, Col, Input} from 'antd';
import "antd/dist/antd.css";
const { Meta } = Card;

Array.prototype.avg = function (call) {
    let type = Object.prototype.toString.call(call);
    let sum = 0;
    if (type === '[object Function]') {
        sum = this.reduce((pre, cur, i) => pre + call(cur, i), 0);
    }
    return sum / this.length;
};
function App() {

    const randomString = (len) => {
        len = len || 32;
        let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
        let maxPos = $chars.length;
        let pwd = '';
        for (let i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    }
    const options = {
        connectTimeout: 4000,  //超时时间
        clientId: randomString(30),  //随机生成ID
        username: 'wjmWeb',  //用户名
        password: 'wjmWeb',  //密码
    }
    const [client, setClient] = useState(null); // mqtt client
    const [listData, setListData] = useState([]) // 页面数据
    const [mqttData, setMqttData] = useState({})// 页面数据
    const [uniqueData, setUniqueData] = useState([])// 页面数据
    const [SortDataArr, setSortDataArr] = useState([])// 页面数据
    const [imgType, setImgType] = useState(false) // 页面 img 的展示 状态
    const [FindMostNum, setFindMostNum] = useState({}) // 最大 出现
    const [readyArr, setReadyArr] = useState({}) // 当前 准备 完成 的
    const [Avg, setAvg] = useState('') // 平均数
    const [isModalVisible, setIsModalVisible] = useState(true) // 初始房间号
    const [inputV, setInputV] = useState('')// input 号

    // 链接 mqtt
    const mqttConnect = (host, mqttOption) => {
        setClient(mqtt.connect(host, mqttOption));
    };
    // 组件卸载
    useEffect(() => {
        return () => {
            client && client.end(() => {
            });
        }
    }, [])

    // 初始弹窗 链接 mqtt
    const onClickBtnRoom = () => {
        setIsModalVisible(false)
        mqttConnect('wss://www.wjmwjh.top:5050', options)
    }
    // mqtt API 处理
    useEffect(() => {
        if (client) {
            client.on('connect', () => {
                // 发布房间 主题
                client.subscribe(inputV, {qos: 0}, function (err) {
                    console.log("subscribe temp topic")
                })
            });
            client.on('error', (err) => {
                console.error('Connection error: ', err);
                client.end();
            });

            /// 接消息
            client.on('message', (topic, message) => {
                const payload = {topic, message: message.toString()};
                setMqttData(JSON.parse(message.toString()) || null)

            });
        }
    }, [client]);

    // 处理 mqtt 返回数据
    useEffect(() => {
        const {phone,name,num,msg} = mqttData
        listData.forEach(ele=>{
            if (ele.phone == phone) {
                ele.name = name
                ele.num = num
                ele.msg = msg
            }
        })
        if (phone) {
            setListData([...listData,mqttData])
        }
    }, [mqttData])

    // 处理 mqtt 返回数据
    useEffect(() => {
        const unique = (arr, u_key) => {
            let map = new Map()
            arr.forEach((item, index) => {
                if (!map.has(item[u_key])) {
                    map.set(item[u_key], item)
                }
            })
            return [...map.values()]
        }
        let readyArr = unique(listData, 'phone').filter(ele=>ele.num !== 8080)
        setReadyArr(readyArr)
        setUniqueData(unique(listData, 'phone'))
    }, [listData])

    // 结束 出结果
    const onClickBtn = () => {
        setImgType(true)
        let arrSort0 = [...uniqueData]
        let arrSort = arrSort0.filter(ele=>ele.num !== 8080)
        arrSort.sort(function(a,b){
            return a.num < b.num ? 1 : -1
        });
        setSortDataArr(arrSort)
        let findMostArr = []
        arrSort.forEach(ele=>{
            findMostArr.push(ele.num)
        })
        function findMost (arr) {
            if (!arr.length) return;
            if (arr.length === 1) return 1;
            let res = {};
            let maxName, maxNum = 0
            // 遍历数组
            arr.forEach((item) => {
                res[item] ? res[item] += 1 : res[item]= 1
                if (res[item] > maxNum) {
                    maxName = item
                    maxNum = res[item]
                }
            })
            return {maxName,maxNum};
        }
        console.log(findMost(findMostArr));
        setFindMostNum(findMost(findMostArr))
        let bigArrFilter = arrSort.filter(ele=>ele.num !== 9999)
        if (bigArrFilter.length > 3) {
            bigArrFilter.splice(0,1)
            bigArrFilter.splice(bigArrFilter.length-1,1)
        }
        console.log(bigArrFilter);
        setAvg(bigArrFilter.avg(e => e.num))
        uniqueData.forEach(ele=>{
            client.publish(ele.phone, JSON.stringify({type:2}))// 结束本次评测
        })
    }

    // 清空 房间成员 状态
    const onClickBtnClear = () => {
        setImgType(false)
        setSortDataArr([])
        uniqueData.forEach(ele=>{
            ele.num = 0
        })
        setUniqueData(uniqueData)
        uniqueData.forEach(ele=>{
            client.publish(ele.phone, JSON.stringify({type:1}))// 清空状态
        })
    }
    return (
        <div className="App">
            {/*  头像展示 */}
            <Card style={{ marginBottom: 20 }} bodyStyle={{ padding: '20px' }}>
                <Row align='middle' gutter={[4, 20]}>
                    <Col sm={{ span: 8 }} xs={{ span: 24 }}>
                        <Button type="primary" onClick={onClickBtn}> 结束本次评测 </Button>
                    </Col>
                    <Col sm={{ span: 8 }} xs={{ span: 24 }}>
                        <Button type="primary" onClick={onClickBtnClear}> 开始新一轮评测 </Button>
                    </Col>
                    <Col sm={{ span: 8 }} xs={{ span: 24 }}>
                        当前在线评测人数： { uniqueData.length } / Ready人数：{readyArr.length}
                    </Col>
                </Row>
                {
                    SortDataArr.length !== 0 &&
                    <Row style={{ marginTop: 20 , fontSize: '30px'}} align='middle' gutter={[4, 20]}>
                        <Col sm={{ span: 6 }} xs={{ span: 24 }}>
                            最大值： {SortDataArr[0]&&SortDataArr[0].num === 9999 ? '∞' : SortDataArr[0]&&SortDataArr[0].num}
                        </Col>
                        <Col sm={{ span: 6 }} xs={{ span: 24 }}>
                            平均值： {Avg ? Math.ceil(Avg) : '∞'}

                        </Col>
                        <Col sm={{ span: 6 }} xs={{ span: 24 }}>
                            最小值： {SortDataArr[0]&&SortDataArr[SortDataArr.length -1].num === 9999 ? '∞' : SortDataArr[0]&&SortDataArr[SortDataArr.length -1].num }
                        </Col>
                        <Col sm={{ span: 6}} xs={{ span: 24 }}>
                            次数最多 ：
                            {
                                FindMostNum.maxNum > 1 &&
                                    <span>
                                         {FindMostNum.maxName} 出现了：{FindMostNum.maxNum} 次
                                    </span>
                            }
                        </Col>
                        {
                            SortDataArr[0]&&SortDataArr[0].num === 9999 &&
                            <span style={{ marginLeft: '20px', fontSize: '14px' }}>无穷大未参与平均值计算</span>
                        }
                    </Row>
                }

            </Card>
            <Space size={[8, 16]} wrap>
                {
                    uniqueData.map((ele, index) => {
                        return (
                            <Card
                                key={index}
                                hoverable={true}
                                style={{width: 250 , height: 390}}
                                cover={
                                    <img
                                        className='img'
                                        alt="example"
                                        src={ ele.num == 8080 ? './img/Notready.jpg' : imgType ? `./img/card${ele.num === 9999 ? 'big' : ele.num}.png` : './img/cardgif.gif'}
                                    />
                                }
                            >
                                <Meta
                                    avatar={<Avatar size={70}>{ele.name}</Avatar>}
                                    title={`${ele.num == 8080 ? 'Not Ready' : 'Ready'}`}
                                    description={`${ele.msg == 1?'在线':'未在线'}`}
                                />
                            </Card>
                        )
                    })
                }
            </Space>

            <Modal  cancelButtonProps={{ disabled: true }} closable={false} title="请输入房间号" visible={isModalVisible} onOk={onClickBtnRoom}>
                <Input placeholder="请输入房间号" value={inputV} onChange={(v)=>{setInputV(v.target.value)}} />
            </Modal>
        </div>
    );
}

export default App;
