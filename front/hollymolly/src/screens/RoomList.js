import React, { useState, useEffect, useRef } from 'react';
import Room from '../components/Room';
import RoomSearchBar from '../components/RoomSearchBar';
import RoomGrid from '../components/RoomGrid';
import axios from 'axios';
import styled from 'styled-components';
import Filter from '../components/Filter';
import ModalBase from '../components/ModalBase';
import Header from '../components/Header.js';
import { useHistory } from 'react-router';

// import Child from '../components/Child';
import RefreshVerification from '../server/RefreshVerification';

// 이미지
import leftArrowBtn from '../assets/leftArrowBtn.png';
import rightArrowBtn from '../assets/rightArrowBtn.png';

// 소켓
import { io } from 'socket.io-client';

let total_room_cnt = 0; // 룸 리스트 총 방의 갯수

//RefreshVerification.verification();

// local storage에 있는지 확인
let data = localStorage.getItem('token');
let save_token = JSON.parse(data) && JSON.parse(data).access_token;
let save_refresh_token = JSON.parse(data) && JSON.parse(data).refresh_token;
let save_user_idx = JSON.parse(data) && JSON.parse(data).user_idx;
let save_user_name = JSON.parse(data) && JSON.parse(data).user_name;

console.log('save_token: ' + save_token);
console.log('save_user_name: ' + save_user_name);

const socket = io('http://3.17.55.178:3002/', {
    // 프론트가 서버와 동일한 도메인에서 제공되지 않는 경우 서버의 URL 전달 필요
    auth: {
        // 1번 토큰
        token: save_token,
    },
});

const RoomList = () => {
    const history = useHistory();

    const [emptyRoomsLength, setEmptyRoomsLength] = useState('');

    const [createRoomData, setcreateRoomData] = useState('');

    const [isSocket, setIsSocket] = useState(false);

    // 방 전체 리스트
    const [rooms, setRooms] = useState();
    // Filter 선택값 결과 배열 list
    const [result, setResult] = useState([]);

    const getResult = (result) => {
        setResult(result);
    };

    const resultArray = result.sort();

    useEffect(() => {
        socket.on('connect', () => {
            console.log('room list connection server');
        });

        socket.on('error', () => {
            setTimeout(() => {
                socket.connect();
                console.log(socket);
            }, 1000);
        });

        // 연결 해제 시 임의 지연 기다린 다음 다시 연결 시도
        socket.on('disconnect', (reason) => {
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    });

    // 맨 처음에 첫 페이지 부름
    useEffect(() => {
        roomListCheckPage(0);
    }, []);

    // 소켓 이벤트 발생 시 부름
    useEffect(() => {
        /* for (let i = 0; i < TOTAL_SLIDES; i++) {
                roomListCheckPage(i);
        } */
    }, [isSocket]);

    // 페이지 슬라이드 개수
    let TOTAL_SLIDES = 0;

    if (total_room_cnt % 6 === 0) {
        TOTAL_SLIDES = total_room_cnt / 6 - 1;
    } else {
        TOTAL_SLIDES = Math.floor(total_room_cnt / 6);
    }

    const [currentSlide, setCurrentSlide] = useState(0);

    // 다음 페이지 이동
    const nextPage = () => {
        if (currentSlide >= TOTAL_SLIDES) {
            // 더 이상 넘어갈 슬라이드가 없으면 슬라이드를 초기화합니다.
            setCurrentSlide(0);
        } else {
            setCurrentSlide(currentSlide + 1);
        }
    };

    // 이전 페이지 이동
    const prevPage = () => {
        if (currentSlide === 0) {
            setCurrentSlide(TOTAL_SLIDES);
        } else {
            setCurrentSlide(currentSlide - 1);
        }
    };

    useEffect(() => {
        //방 생성 시, 마지막 페이지에 방 추가
        socket.on('create room', (data) => {
            setcreateRoomData(data);
            console.log('create room');
        });

        // 방 삭제 - 대기실 삭제
        socket.on('delete room', (data) => {
            console.log('delete room');
        });

        //방 정보 수정  - 특정 대기실에서 대기실 정보 수정 시
        socket.on('edit room', (data) => {
            console.log('edit room');
        });

        // 방 멤버 변동 - 특정 대기실 사용자 입장/퇴장 시
        socket.on('change member count', (data) => {
            console.log('change member count');
            //console.log(data);
            //setIsSocket(!isSocket);
        });

        //방 상태 변동 - 특정 게임이 시작할 때
        socket.on('change game status', (data) => {
            console.log('change game status');
        });
    });

    // 페이지별 룸 리스트 조회
    const roomListCheckPage = async (currentPage) => {
        currentPage = currentSlide + 1;
        var restURL = 'http://3.17.55.178:3002/room?page=' + currentPage;
        restURL = filterUrl(restURL, resultArray);

        const reqHeaders = {
            headers: {
                authorization: 'Bearer ' + save_token,
            },
        };

        axios
            .get(restURL, reqHeaders)
            .then(function (response) {
                total_room_cnt = response.data.total_room_cnt;
                console.log(response.data);
                setRooms(response.data);
                setEmptyRoomsLength(6 - response.data.room_list.length); // empty room list length
            })
            .catch(function (error) {
                console.log(error.data);
            });
    };

    useEffect(() => {
        // 룸 리스트 조회
        const roomListCheck = async () => {
            const currentPage = currentSlide + 1;
            var restURL = 'http://3.17.55.178:3002/room?page=' + currentPage;
            restURL = filterUrl(restURL, resultArray);

            const reqHeaders = {
                headers: {
                    authorization: 'Bearer ' + save_token,
                },
            };

            axios
                .get(restURL, reqHeaders)
                .then(function (response) {
                    total_room_cnt = response.data.total_room_cnt;
                    console.log(response.data);
                    setRooms(response.data);
                    setEmptyRoomsLength(6 - response.data.room_list.length); // empty room list length
                })
                .catch(function (error) {
                    console.log(error.data);
                });
        };

        roomListCheck();
    }, [currentSlide, resultArray]);

    function filterUrl(exitedUrl, resultArray) {
        if (resultArray.includes(6)) {
            // 대기중
            exitedUrl += '&is_waiting=true';
        } else if (!resultArray.includes(6)) {
            // 게임중
            exitedUrl += '&is_waiting=false';
        }
        if (resultArray.includes(1)) {
            // 난이도 easy
            exitedUrl += '&room_mode=easy';
        }
        if (resultArray.includes(2)) {
            // 난이도 hard
            exitedUrl += '&room_mode=hard';
        }
        if (resultArray.includes(3)) {
            // 인원 4명
            exitedUrl += '&room_start_member_cnt=4';
        }
        if (resultArray.includes(4)) {
            // 인원 5명
            exitedUrl += '&room_start_member_cnt=5';
        }
        if (resultArray.includes(5)) {
            // 인원 6명
            exitedUrl += '&room_start_member_cnt=6';
        }
        return exitedUrl;
    }

    // 빈방 채우기
    function emptyRoomList() {
        if (emptyRoomsLength !== 6) {
            let forArray = [];
            for (let i = 0; i < emptyRoomsLength; i++) {
                forArray.push(<Room empty="true" />);
            }
            return forArray;
        } else {
            return <EmptyText>😲 해당 필터에 맞는 방이 없습니다.😲</EmptyText>;
        }
    }

    // 랜덤 입장을 위한 필터 리스트 - 모드
    function modeFilterList() {
        let modeFilterArray = [];
        let easy = resultArray.includes(1);
        let hard = resultArray.includes(2);

        if (easy) {
            modeFilterArray.push('easy');
        }

        if (hard) {
            modeFilterArray.push('hard');
        }

        return modeFilterArray;
    }

    // 랜덤 입장을 위한 필터 리스트 - 인원
    function personFilterList() {
        let personFilterArray = [];
        let fourPeople = resultArray.includes(3);
        let fivePeople = resultArray.includes(4);
        let sixPeople = resultArray.includes(5);

        if (fourPeople) {
            personFilterArray.push('4');
        }

        if (fivePeople) {
            personFilterArray.push('5');
        }

        if (sixPeople) {
            personFilterArray.push('6');
        }

        return personFilterArray;
    }

    const randomEntry = async () => {
        let modeFilterArray = modeFilterList();
        let personFilterArray = personFilterList();

        console.log(modeFilterArray);
        console.log(personFilterArray);
        const reqURL = 'http://3.17.55.178:3002/room/random'; //parameter : 방 타입
        const reqHeaders = {
            headers: {
                authorization: 'Bearer ' + save_token,
            },
        };

        axios
            .post(
                reqURL,
                {
                    room_mode: modeFilterArray,
                    room_start_member_cnt: personFilterArray,
                },
                reqHeaders
            )
            .then(function (response) {
                console.log(response.data);
                // 대기실로 이동
                history.push({
                    pathname: '/waitingroom/' + response.data.room_idx,
                    state: { data: response.data },
                });
            })
            .catch(function (error) {
                console.log(error.response);
            });
    };

    return (
        <React.Fragment>
            <Background>
                <Header />
                <RoomGrid flexDirection="column" padding="20px" width="1020px" height="620px" bg="#DAD4F6">
                    {/* 검색바 & 버튼 div*/}
                    <RoomGrid is_flex_space width="980px" height="110px" bg="#DAD4F6" border="1px solid #DAD4F6">
                        <div style={styles.grid}>
                            <RoomSearchBar />
                        </div>
                        {/* 버튼 div*/}
                        <div
                            style={{
                                flexDirection: 'column',
                                width: '220px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* 방만들기 모달 */}
                            <ModalBase />
                            <br />
                            <Button onClick={randomEntry}>랜덤 입장</Button>
                        </div>
                    </RoomGrid>

                    {/* 방 & 필터 div*/}
                    <RoomGrid is_flex_space width="980px" height="460px" bg="#DAD4F6" border="1px solid #DAD4F6">
                        {/* 왼쪽 화살표 div*/}
                        <PrevBtn onClick={prevPage} />
                        {/* 방 리스트 슬라이더 div*/}
                        <div style={styles.sliderContainer}>
                            <div style={styles.roomListContainer}>
                                {rooms &&
                                    rooms.room_list.map((values) => {
                                        return values.room_status === 'waiting' ? (
                                            <Room
                                                room_idx={values.room_idx}
                                                room_name={values.room_name}
                                                room_current_member={values.room_current_member_cnt}
                                                room_start_member={values.room_start_member_cnt}
                                                room_mode={values.room_mode}
                                                room_status={values.room_status}
                                                disabled="false"
                                                textStroke="true"
                                                cursor="true"
                                            />
                                        ) : (
                                            <Room
                                                room_idx={values.room_idx}
                                                room_name={values.room_name}
                                                room_current_member={values.room_current_member_cnt}
                                                room_start_member={values.room_start_member_cnt}
                                                room_mode={values.room_mode}
                                                room_status={values.room_status}
                                                disabled="true"
                                                textStroke="true"
                                                cursor="false"
                                            />
                                        );
                                    })}
                                {createRoomData && (
                                    <Room
                                        room_idx={createRoomData.room_idx}
                                        room_name={createRoomData.room_name}
                                        room_current_member={createRoomData.room_current_member_cnt}
                                        room_start_member={createRoomData.room_start_member_cnt}
                                        room_mode={createRoomData.room_mode}
                                        room_status={createRoomData.room_status}
                                        disabled="false"
                                        textStroke="true"
                                        cursor="true"
                                    />
                                )}
                                {emptyRoomList()}
                            </div>
                            <div style={styles.pageContainer}>
                                {currentSlide + 1}/ {TOTAL_SLIDES + 1}
                            </div>
                        </div>
                        {/* 오른쪽 화살표 div*/}
                        <NextBtn onClick={nextPage} />
                        {/* 필터 div*/}
                        <Filter result={result} getResult={getResult} />
                    </RoomGrid>
                </RoomGrid>
            </Background>
        </React.Fragment>
    );
};

const Background = styled.div`
    background-color: #180928;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;
const NextBtn = styled.div`
    width: 40px;
    height: 40px;
    background-size: contain;
    background-image: url(${rightArrowBtn});
`;

const PrevBtn = styled.div`
    width: 40px;
    height: 40px;
    background-size: contain;
    background-image: url(${leftArrowBtn});
`;

const Button = styled.button`
    background: white;
    color: palevioletred;
    width: 130px;
    height: 40px;
    font-size: 1em;
    font-weight: bolder;
    margin: 0px 0px 15px 0px;
    padding: 0.25px 1px;
    border: 2px solid palevioletred;
    border-radius: 15px;

    &:hover {
        background: palevioletred;
        color: white;
        border: white;
    }
`;

const EmptyText = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flexdirection: column;
    width: 680px;
    height: 410px;
    font-size: 20px;
`;

export default RoomList;

const styles = {
    grid: {
        width: '220px',
        height: '110px',
        background: '#DAD4F6',
        marginLeft: '42px',
    },
    roomListContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexDirection: 'column',
        width: '680px',
        height: '410px',
        flexFlow: 'row wrap',
    },
    sliderContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexDirection: 'column',
        width: '680px',
        height: '430px',
        overflow: 'hidden',
    },
    pageContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        width: '680px',
        height: '15px',
        color: '#ffffff',
    },
};
