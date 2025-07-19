 import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    signOut,
    EmailAuthProvider,
    linkWithCredential
} from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

// Modal bileşeni
const Modal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-sm w-full relative rounded-xl">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <p className="text-lg text-center mb-4">{message}</p>
                <button
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                    onClick={onClose}
                >
                    Tamam
                </button>
            </div>
        </div>
    );
};

// Poll Creation Modal (Anket Oluşturma Modalı)
const PollCreationModal = ({ isOpen, onClose, onCreatePoll, setModalMessage, setShowModal }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    if (!isOpen) return null;

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        if (question.trim() === '' || options.some(opt => opt.trim() === '')) {
            setModalMessage('Lütfen tüm alanları doldurun.');
            setShowModal(true);
            return;
        }
        onCreatePoll(question, options.filter(opt => opt.trim() !== ''));
        setQuestion('');
        setOptions(['', '']);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-lg w-full relative rounded-xl">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-xl font-bold mb-4">Anket Oluştur</h2>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Anket Sorusu:</label>
                    <input
                        type="text"
                        className="w-full p-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Anket sorunuzu girin..."
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Seçenekler:</label>
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center mb-2">
                            <input
                                type="text"
                                className="flex-grow p-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 mr-2"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Seçenek ${index + 1}`}
                            />
                            {options.length > 2 && (
                                <button
                                    onClick={() => removeOption(index)}
                                    className="text-red-400 hover:text-red-600 focus:outline-none"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={addOption}
                        className="mt-2 bg-gray-600 text-white py-1 px-3 rounded-md hover:bg-gray-700 transition-colors duration-200 focus:outline-none"
                    >
                        Seçenek Ekle
                    </button>
                </div>
                <button
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                >
                    Anket Oluştur
                </button>
            </div>
        </div>
    );
};

// Contact Profile Modal (Kişi Profili Modalı)
const ContactProfileModal = ({ isOpen, onClose, contact, onAddFriend, userId, currentUserFriends, onStartPrivateChat }) => {
    if (!isOpen || !contact) return null;

    const isFriend = currentUserFriends?.includes(contact.id);
    const isSelf = userId === contact.id;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-sm w-full relative rounded-xl text-center">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <img src={contact.avatar} className="w-24 h-24 rounded-full border-4 border-blue-400 mx-auto mb-4 object-cover" alt="Kişi Resmi" />
                <h2 className="text-2xl font-bold mb-2">{contact.name}</h2>
                <p className="text-gray-300 mb-2">{contact.status}</p>
                <p className="text-sm text-gray-400 break-all mb-4">ID: {contact.id}</p>
                {!isSelf && (
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={() => {
                                onAddFriend(contact.id);
                                onClose();
                            }}
                            className={`w-full py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none ${isFriend ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            disabled={isFriend}
                        >
                            {isFriend ? 'Arkadaş Eklendi' : 'Arkadaş Ekle'}
                        </button>
                        {isFriend && (
                            <button
                                onClick={() => {
                                    onStartPrivateChat(contact.id, contact.name);
                                    onClose();
                                }}
                                className="w-full py-2 rounded-md font-semibold bg-green-600 hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                            >
                                Özel Sohbet Başlat
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Auth Modal (Giriş/Kayıt Modalı)
const AuthModal = ({ isOpen, onClose, auth, db, appId, setModalMessage, setShowModal, onGuestLogin }) => {
    const [authMethod, setAuthMethod] = useState('email'); // 'email', 'guest', 'phone'
    const [isLogin, setIsLogin] = useState(true); // E-posta veya telefon için
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    if (!isOpen) return null;

    const handleAuthSubmit = async () => {
        try {
            if (authMethod === 'email') {
                if (!email.endsWith('@gmail.com')) {
                    setModalMessage("Lütfen geçerli bir '@gmail.com' e-posta adresi girin.");
                    setShowModal(true);
                    return;
                }
                if (!isLogin && password.length < 6) {
                    setModalMessage("Şifre en az 6 karakter olmalıdır.");
                    setShowModal(true);
                    return;
                }

                if (isLogin) {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    if (!userCredential.user.emailVerified) {
                        setModalMessage("E-posta adresiniz doğrulanmadı. Lütfen e-postanızı kontrol edin.");
                        setShowModal(true);
                        await signOut(auth);
                        return;
                    }
                    setModalMessage("Başarıyla giriş yapıldı!");
                } else {
                    // Kayıt ol - Misafir hesabı bağlama veya yeni hesap oluşturma
                    if (auth.currentUser && auth.currentUser.isAnonymous) {
                        try {
                            const credential = EmailAuthProvider.credential(email, password);
                            const userCredential = await linkWithCredential(auth.currentUser, credential);
                            // Bağlama başarılı, anonim kullanıcının UID'si artık e-posta/şifreye bağlı
                            await sendEmailVerification(userCredential.user);
                            // Kullanıcı profilini güncelle (e-posta ve isim ekle)
                            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid);
                            await updateDoc(userDocRef, {
                                name: name || `Kullanıcı ${userCredential.user.uid.substring(0, 6)}`,
                                email: email,
                                isEmailVerified: false,
                            });
                            setModalMessage("Hesabınız e-posta ile bağlandı ve oluşturuldu! Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.");
                            // Oturum açık kalır, kullanıcı doğrulamayı bekler
                        } catch (linkError) {
                            let linkErrorMessage = "Hesap bağlanırken bir hata oluştu.";
                            if (linkError.code === 'auth/credential-already-in-use' || linkError.code === 'auth/email-already-in-use') {
                                linkErrorMessage = "Bu e-posta adresi zaten başka bir hesaba bağlı. Lütfen farklı bir e-posta kullanın veya mevcut hesabınızla giriş yapın.";
                            }
                            setModalMessage(linkErrorMessage);
                            setShowModal(true);
                            console.error("Hesap bağlama hatası:", linkError);
                            return; // Hata durumunda işlemi durdur
                        }
                    } else {
                        // Anonim kullanıcı yoksa veya zaten e-posta ile giriş yapılmışsa yeni hesap oluştur
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        await sendEmailVerification(userCredential.user);
                        await setDoc(doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid), {
                            id: userCredential.user.uid,
                            name: name || `Kullanıcı ${userCredential.user.uid.substring(0, 6)}`,
                            avatar: 'https://placehold.co/150x150/FF6347/FFFFFF?text=User',
                            status: 'Çevrimiçi',
                            createdAt: serverTimestamp(),
                            email: email,
                            isEmailVerified: false,
                            friends: []
                        });
                        setModalMessage("Hesabınız oluşturuldu! Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.");
                        await signOut(auth); // E-posta doğrulanana kadar çıkış yap
                    }
                }
            } else if (authMethod === 'phone') {
                if (!codeSent) {
                    // Simulate sending code
                    setModalMessage(`Doğrulama kodu ${phoneNumber} numarasına gönderildi. (Simülasyon)`);
                    setShowModal(true);
                    setCodeSent(true);
                    return;
                } else {
                    // Simulate verifying code
                    if (verificationCode === '123456') { // Simple hardcoded code for simulation
                        // Gerçek bir uygulamada signInWithPhoneNumber ve kodu onayla kullanılırdı
                        // Simülasyon için anonim giriş yapıp verileri ilişkilendiriyoruz
                        const userCredential = await signInAnonymously(auth);
                        await setDoc(doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid), {
                            id: userCredential.user.uid,
                            name: name || `Telefon Kullanıcısı ${phoneNumber.substring(phoneNumber.length - 4)}`,
                            avatar: 'https://placehold.co/150x150/FF6347/FFFFFF?text=Phone',
                            status: 'Çevrimiçi',
                            createdAt: serverTimestamp(),
                            phoneNumber: phoneNumber, // Telefon numarasını referans için sakla
                            friends: []
                        });
                        setModalMessage("Telefon numarası ile başarıyla giriş yapıldı!");
                    } else {
                        setModalMessage("Yanlış doğrulama kodu. Lütfen tekrar deneyin.");
                        setShowModal(true);
                        return;
                    }
                }
            }
            setShowModal(true);
            onClose();
        } catch (error) {
            let errorMessage = "Bir hata oluştu.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Geçersiz e-posta adresi.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Şifre en az 6 karakter olmalıdır.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Geçersiz e-posta veya şifre.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Çok fazla deneme. Lütfen daha sonra tekrar deneyin.";
            }
            setModalMessage(errorMessage);
            setShowModal(true);
            console.error("Kimlik doğrulama hatası:", error);
        }
    };

    const handleGuestClick = async () => {
        try {
            await onGuestLogin();
            setModalMessage("Misafir olarak başarıyla giriş yapıldı!");
            setShowModal(true);
            onClose();
        } catch (error) {
            setModalMessage("Misafir olarak giriş yapılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Misafir giriş hatası:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-3xl font-bold text-center mb-6">Giriş Yap / Kayıt Ol</h2>

                <div className="flex justify-center mb-6 space-x-4">
                    <button
                        className={`px-4 py-2 rounded-md font-semibold ${authMethod === 'email' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        onClick={() => { setAuthMethod('email'); setCodeSent(false); }}
                    >
                        E-posta
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md font-semibold ${authMethod === 'phone' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        onClick={() => { setAuthMethod('phone'); setCodeSent(false); }}
                    >
                        Telefon
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md font-semibold ${authMethod === 'guest' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        onClick={() => { setAuthMethod('guest'); setCodeSent(false); }}
                    >
                        Misafir
                    </button>
                </div>

                {authMethod === 'email' && (
                    <>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
                                E-posta (@gmail.com)
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="e-posta@gmail.com"
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                                Şifre
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Şifreniz (en az 6 karakter)"
                                minLength="6"
                            />
                        </div>
                        {!isLogin && (
                            <div className="mb-6">
                                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="name">
                                    Kullanıcı Adı
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Kullanıcı adınız"
                                />
                            </div>
                        )}
                        <button
                            onClick={handleAuthSubmit}
                            className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                        >
                            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                        </button>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="w-full mt-4 text-blue-400 hover:text-blue-300 transition-colors duration-200 focus:outline-none"
                        >
                            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
                        </button>
                    </>
                )}

                {authMethod === 'phone' && (
                    <>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="phoneNumber">
                                Telefon Numarası
                            </label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+90 5xx xxx xx xx"
                            />
                        </div>
                        {!codeSent ? (
                            <button
                                onClick={handleAuthSubmit}
                                className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                            >
                                Doğrulama Kodu Gönder
                            </button>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="verificationCode">
                                        Doğrulama Kodu (Simülasyon: 123456)
                                    </label>
                                    <input
                                        type="text"
                                        id="verificationCode"
                                        className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="Kodu girin"
                                    />
                                </div>
                                <button
                                    onClick={handleAuthSubmit}
                                    className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                                >
                                    Giriş Yap
                                </button>
                            </>
                        )}
                        {!isLogin && (
                            <div className="mt-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="name">
                                    Kullanıcı Adı
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Kullanıcı adınız"
                                />
                            </div>
                        )}
                    </>
                )}

                {authMethod === 'guest' && (
                    <button
                        onClick={handleGuestClick}
                        className="w-full bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                    >
                        Misafir Olarak Devam Et
                    </button>
                )}
            </div>
        </div>
    );
};

// Call Incoming Modal
const CallIncomingModal = ({ isOpen, onClose, callerName, onAccept, onReject }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-sm w-full relative rounded-xl text-center">
                <h2 className="text-2xl font-bold mb-4">{callerName} sizi arıyor...</h2>
                <p className="text-gray-300 mb-6">Görüntülü/Sesli arama daveti.</p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onAccept}
                        className="bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                    >
                        Kabul Et
                    </button>
                    <button
                        onClick={onReject}
                        className="bg-red-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-red-700 transition-colors duration-200 focus:outline-none"
                    >
                        Reddet
                    </button>
                </div>
            </div>
        </div>
    );
};

// Ana uygulama bileşeni
const App = () => {
    // Firebase ve kimlik doğrulama durumları
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false); // Auth modalını kontrol eder

    // Sohbet geçmişi için state
    const [messages, setMessages] = useState([]);
    // Yeni mesaj girişi için state
    const [newMessage, setNewMessage] = useState('');
    // Kullanıcı bilgileri için state (Firebase kullanıcısından gelecek)
    const [currentUser, setCurrentUser] = useState(null);
    // Sohbet ettiğimiz kişi/grup bilgileri için state
    const [selectedChat, setSelectedChat] = useState(null); // Seçili sohbet (kullanıcı veya grup)

    // Grup listesi
    const [groups, setGroups] = useState([]);
    // Diğer kullanıcılar (Firestore'dan çekilecek gerçek kullanıcılar)
    const [contacts, setContacts] = useState([]);

    // Aksiyon menüsünün görünürlüğünü yöneten state
    const [showActionMenu, setShowActionMenu] = useState(false);
    // Modal görünürlüğünü ve mesajını yöneten state'ler
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    // Anket oluşturma modalı
    const [showPollModal, setShowPollModal] = useState(false);
    // Görüntülü konuşma ekranı görünürlüğü
    const [showVideoCallScreen, setShowVideoCallScreen] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const localVideoRef = useRef(null);

    // Kişi profili modalı için state
    const [showContactProfileModal, setShowContactProfileModal] = useState(false);
    const [selectedContactForProfile, setSelectedContactForProfile] = useState(null);

    // Gelen arama modalı için state
    const [showCallIncomingModal, setShowCallIncomingModal] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const videoCallWindowRef = useRef(null); // Yeni pencere referansı

    // Mesajların en alta kaydırılması için ref
    const messagesEndRef = useRef(null);

    // Bildirim izni iste ve yeni mesaj geldiğinde bildirim göster
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Bildirim izni verildi.');
                }
            });
        }
    }, []);

    // Firebase'i başlat ve kimlik doğrulamayı yönet
    useEffect(() => {
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);

            // Kimlik doğrulama durumu değiştiğinde
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    // Kullanıcı profilini Firestore'dan al veya oluştur
                    const userDocRef = doc(firestore, `artifacts/${appId}/public/data/users`, user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        setCurrentUser(userDocSnap.data());
                    } else {
                        // Yeni kullanıcı için varsayılan profil oluştur
                        const newUserProfile = {
                            id: user.uid,
                            name: `Misafir ${user.uid.substring(0, 6)}`,
                            avatar: 'https://placehold.co/150x150/FF6347/FFFFFF?text=User',
                            status: 'Çevrimiçi',
                            createdAt: serverTimestamp(),
                            friends: []
                        };
                        await setDoc(userDocRef, newUserProfile);
                        setCurrentUser(newUserProfile);

                        // İlk girişse isim belirleme modalı göster (sadece anonim kullanıcılar için)
                        if (user.isAnonymous && !userDocSnap.exists()) {
                            setTimeout(() => {
                                const initialName = prompt("Hoş geldiniz! Lütfen bir kullanıcı adı belirleyin:");
                                if (initialName && initialName.trim() !== '') {
                                    handleEditUserName(initialName.trim());
                                }
                            }, 1000);
                        }
                    }
                    setIsAuthReady(true);
                    setShowAuthModal(false); // Kullanıcı giriş yaptıysa AuthModal'ı kapat
                } else {
                    setUserId(null);
                    setCurrentUser(null);
                    setIsAuthReady(true);
                    setShowAuthModal(true); // Kullanıcı yoksa giriş/kayıt modalını göster
                }
                setLoading(false);
            });

            // İlk yüklemede Canvas token'ı varsa anonim giriş yap, yoksa AuthModal'ı göster
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (initialAuthToken && !firebaseAuth.currentUser) {
                signInWithCustomToken(firebaseAuth, initialAuthToken).catch(e => {
                    console.error("Özel token ile giriş yapılamadı, anonim olarak deneniyor:", e);
                    signInAnonymously(firebaseAuth);
                });
            } else if (!firebaseAuth.currentUser) {
                setShowAuthModal(true);
            }

            // Uygulama kapatılırken son görülme zamanını güncelle
            const handleBeforeUnload = async () => {
                if (userId && db) {
                    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
                    await updateDoc(userDocRef, {
                        status: `Son Görülme: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                    });
                }
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                unsubscribe();
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        } catch (error) {
            console.error("Firebase başlatılırken hata oluştu:", error);
            setLoading(false);
        }
    }, []);

    // Misafir olarak giriş yapma fonksiyonu
    const handleGuestLogin = async () => {
        if (auth) {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Misafir olarak giriş yapılırken hata:", error);
                setModalMessage("Misafir olarak giriş yapılırken bir hata oluştu.");
                setShowModal(true);
            }
        }
    };

    // Mesajlar güncellendiğinde en alta kaydır
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    // Firestore'dan mesajları, grupları, kullanıcıları ve aramaları dinle
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // Tüm kullanıcıları dinle
        const unsubscribeUsers = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/users`)), (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setContacts(fetchedUsers.filter(user => user.id !== userId));
        }, (error) => console.error("Kullanıcılar dinlenirken hata:", error));

        // Genel sohbet mesajlarını dinle (sadece genel sohbet seçiliyse güncellenecek)
        const unsubscribePublicMessages = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/messages`)), (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) || 'Şimdi'
            }));
            const newMessages = fetchedMessages.filter(msg => !messages.some(prevMsg => prevMsg.id === msg.id));
            newMessages.forEach(msg => {
                if (msg.senderId !== userId && (!selectedChat || selectedChat.id !== msg.chatTargetId || selectedChat.type !== msg.chatType)) {
                    showNotification(`Yeni Mesaj: ${msg.senderName}`, msg.text);
                    playNewMessageSound();
                }
            });
            if (!selectedChat || selectedChat.type === 'public') {
                setMessages(fetchedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            }
        }, (error) => console.error("Genel mesajlar dinlenirken hata:", error));

        // Grupları dinle
        const unsubscribeGroups = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/groups`)), (snapshot) => {
            const fetchedGroups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGroups(fetchedGroups);
        }, (error) => console.error("Gruplar dinlenirken hata:", error));

        // Gelen aramaları dinle
        const unsubscribeCalls = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/calls`)), async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const callData = change.doc.data();
                if (callData.calleeId === userId && callData.status === 'pending' && change.type === 'added') {
                    const callerDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/users`, callData.callerId));
                    const callerName = callerDoc.exists() ? callerDoc.data().name : 'Bilinmeyen Kullanıcı';
                    setIncomingCallData({ ...callData, callerName, callId: change.doc.id });
                    setShowCallIncomingModal(true);
                    showNotification(`Gelen Arama: ${callerName}`, 'Görüntülü/Sesli arama daveti.');
                } else if ((callData.callerId === userId || callData.calleeId === userId) && callData.status === 'ended' && change.type === 'modified') {
                    if (videoCallWindowRef.current) {
                        videoCallWindowRef.current.close();
                        videoCallWindowRef.current = null;
                    }
                    if (localStream) {
                        localStream.getTracks().forEach(track => track.stop());
                        setLocalStream(null);
                    }
                    setShowVideoCallScreen(false);
                    setModalMessage("Arama sonlandırıldı.");
                    setShowModal(true);
                    // Arama belgesini Firestore'dan sil
                    await deleteDoc(doc(db, `artifacts/${appId}/public/data/calls`, change.doc.id));
                } else if (callData.calleeId === userId && callData.status === 'accepted' && change.type === 'modified') {
                    setModalMessage("Arama bağlandı!");
                    setShowModal(true);
                    setShowCallIncomingModal(false); // Gelen arama modalını kapat
                    // Görüntülü arama penceresini aç
                    startVideoCallInNewWindow(callData.callId);
                } else if (callData.callerId === userId && callData.status === 'accepted' && change.type === 'modified') {
                    setModalMessage("Arama bağlandı!");
                    setShowModal(true);
                    // Görüntülü arama penceresini aç
                    startVideoCallInNewWindow(callData.callId);
                }
            });
        }, (error) => console.error("Aramalar dinlenirken hata:", error));


        if (!selectedChat) {
            setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' });
        }

        return () => {
            unsubscribeUsers();
            unsubscribePublicMessages();
            unsubscribeGroups();
            unsubscribeCalls();
        };
    }, [db, isAuthReady, userId, selectedChat]); // 'messages' bağımlılığı kaldırıldı

    // Seçili sohbet değiştiğinde mesajları dinle
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !selectedChat) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        let unsubscribe;

        if (selectedChat.type === 'public') {
            unsubscribe = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/messages`), orderBy('timestamp')), (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) || 'Şimdi'
                }));
                setMessages(fetchedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            }, (error) => console.error("Genel mesajlar dinlenirken hata:", error));
        } else if (selectedChat.type === 'group') {
            unsubscribe = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`), orderBy('timestamp')), (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) || 'Şimdi'
                }));
                setMessages(fetchedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            }, (error) => console.error(`Grup mesajları (${selectedChat.id}) dinlenirken hata:`, error));
        } else if (selectedChat.type === 'private') {
            // Özel sohbet mesajlarını dinle
            unsubscribe = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`), orderBy('timestamp')), (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) || 'Şimdi'
                }));
                setMessages(fetchedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            }, (error) => console.error(`Özel mesajlar (${selectedChat.id}) dinlenirken hata:`, error));
        } else {
            setMessages([]);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [db, isAuthReady, userId, selectedChat]); // 'messages' bağımlılığı kaldırıldı


    // Mesaj gönderme fonksiyonu
    const sendMessage = async () => {
        if (newMessage.trim() === '' || !db || !userId || !selectedChat) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const messageData = {
            text: newMessage,
            senderId: userId,
            senderName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
            timestamp: serverTimestamp(),
            chatType: selectedChat.type,
            chatTargetId: selectedChat.id
        };

        try {
            if (selectedChat.type === 'public') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/messages`), messageData);
            } else if (selectedChat.type === 'group') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`), messageData);
            } else if (selectedChat.type === 'private') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`), messageData);
            }
            setNewMessage('');
        } catch (e) {
            console.error("Mesaj gönderilirken hata oluştu: ", e);
        }
    };

    // Mesajları en alta kaydırma fonksiyonu
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Yeni grup oluşturma fonksiyonu
    const createNewGroup = async () => {
        const groupName = prompt("Yeni grubun adını girin:");
        if (groupName && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            try {
                const newGroupRef = await addDoc(collection(db, `artifacts/${appId}/public/data/groups`), {
                    name: groupName,
                    members: [userId],
                    createdAt: serverTimestamp()
                });
                setSelectedChat({ id: newGroupRef.id, name: groupName, type: 'group' });
                setModalMessage(`'${groupName}' grubu başarıyla oluşturuldu!`);
                setShowModal(true);
            } catch (e) {
                console.error("Grup oluşturulurken hata oluştu: ", e);
                setModalMessage("Grup oluşturulurken bir hata oluştu.");
                setShowModal(true);
            }
        } else if (groupName === "") {
            setModalMessage("Grup adı boş bırakılamaz.");
            setShowModal(true);
        }
    };

    // Bildirim gösterme fonksiyonu
    const showNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    };

    // Yeni mesaj sesi çalma fonksiyonu
    const playNewMessageSound = () => {
        const audio = new Audio('https://www.soundjay.com/buttons/beep-07.mp3');
        audio.play().catch(e => console.error("Ses çalınamadı:", e));
    };

    // Kullanıcı ID'sini panoya kopyalama fonksiyonu
    const copyUserIdToClipboard = () => {
        if (userId) {
            const el = document.createElement('textarea');
            el.value = userId;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setModalMessage("Kullanıcı ID'si panoya kopyalandı!");
            setShowModal(true);
        }
    };

    // Kullanıcı adını düzenleme
    const handleEditUserName = async (newName = null) => {
        const nameToSet = newName || prompt("Yeni kullanıcı adınızı girin:");
        if (nameToSet && nameToSet.trim() !== '' && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            try {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
                await updateDoc(userDocRef, { name: nameToSet.trim() });
                setCurrentUser(prev => ({ ...prev, name: nameToSet.trim() }));
                setModalMessage("Kullanıcı adınız başarıyla güncellendi!");
                setShowModal(true);
            } catch (e) {
                console.error("Kullanıcı adı güncellenirken hata:", e);
                setModalMessage("Kullanıcı adı güncellenirken bir hata oluştu.");
                setShowModal(true);
            }
        } else if (nameToSet !== null && nameToSet.trim() === '') {
            setModalMessage("Kullanıcı adı boş bırakılamaz.");
            setShowModal(true);
        }
    };

    // Arkadaş ekleme fonksiyonu
    const addFriend = async (friendIdToAdd) => {
        const friendId = friendIdToAdd || prompt("Eklemek istediğiniz arkadaşın ID'sini girin:");
        if (friendId && friendId.trim() !== '' && db && userId && currentUser) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            try {
                const friendDocRef = doc(db, `artifacts/${appId}/public/data/users`, friendId);
                const friendDocSnap = await getDoc(friendDocRef);

                if (!friendDocSnap.exists()) {
                    setModalMessage("Belirtilen ID'ye sahip bir kullanıcı bulunamadı.");
                    setShowModal(true);
                    return;
                }
                if (currentUser.friends.includes(friendId)) {
                    setModalMessage("Bu kullanıcı zaten arkadaş listenizde.");
                    setShowModal(true);
                    return;
                }
                if (friendId === userId) {
                    setModalMessage("Kendinizi arkadaş olarak ekleyemezsiniz.");
                    setShowModal(true);
                    return;
                }

                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
                await updateDoc(userDocRef, {
                    friends: arrayUnion(friendId)
                });
                setCurrentUser(prev => ({ ...prev, friends: [...prev.friends, friendId] }));

                setModalMessage(`'${friendDocSnap.data().name}' arkadaş olarak eklendi!`);
                setShowModal(true);
            } catch (e) {
                console.error("Arkadaş eklenirken hata:", e);
                setModalMessage("Arkadaş eklenirken bir hata oluştu.");
                setShowModal(true);
            }
        } else if (friendId !== null && friendId.trim() === '') {
            setModalMessage("Arkadaş ID'si boş bırakılamaz.");
            setShowModal(true);
        }
    };

    // Seçili gruba üye ekleme fonksiyonu
    const addMemberToGroup = async () => {
        if (!selectedChat || selectedChat.type !== 'group') {
            setModalMessage("Lütfen önce bir grup seçin.");
            setShowModal(true);
            return;
        }
        const memberId = prompt(`'${selectedChat.name}' grubuna eklemek istediğiniz kullanıcının ID'sini girin:`);
        if (memberId && memberId.trim() !== '' && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            try {
                const memberDocRef = doc(db, `artifacts/${appId}/public/data/users`, memberId);
                const memberDocSnap = await getDoc(memberDocRef);

                if (!memberDocSnap.exists()) {
                    setModalMessage("Belirtilen ID'ye sahip bir kullanıcı bulunamadı.");
                    setShowModal(true);
                    return;
                }

                const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, selectedChat.id);
                const groupDocSnap = await getDoc(groupDocRef);
                if (groupDocSnap.exists() && groupDocSnap.data().members.includes(memberId)) {
                    setModalMessage("Bu kullanıcı zaten grubun bir üyesi.");
                    setShowModal(true);
                    return;
                }

                await updateDoc(groupDocRef, {
                    members: arrayUnion(memberId)
                });
                setModalMessage(`'${memberDocSnap.data().name}' gruba eklendi!`);
                setShowModal(true);
            } catch (e) {
                console.error("Gruba üye eklenirken hata:", e);
                setModalMessage("Gruba üye eklenirken bir hata oluştu.");
                setShowModal(true);
            }
        } else if (memberId !== null && memberId.trim() === '') {
            setModalMessage("Üye ID'si boş bırakılamaz.");
            setShowModal(true);
        }
    };

    // Anket oluşturma işleyicisi
    const handleCreatePoll = async (question, options) => {
        if (!db || !userId || !selectedChat) {
            setModalMessage("Anket oluşturmak için bir sohbet seçmelisiniz.");
            setShowModal(true);
            return;
        }
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        try {
            const pollData = {
                type: 'poll',
                question: question,
                options: options.map(opt => ({ text: opt, votes: 0 })),
                senderId: userId,
                senderName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
                timestamp: serverTimestamp(),
                chatType: selectedChat.type,
                chatTargetId: selectedChat.id
            };

            if (selectedChat.type === 'public') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/messages`), pollData);
            } else if (selectedChat.type === 'group') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`), pollData);
            } else if (selectedChat.type === 'private') {
                await addDoc(collection(db, `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`), pollData);
            }
            setModalMessage("Anket başarıyla oluşturuldu!");
            setShowModal(true);
        } catch (e) {
            console.error("Anket oluşturulurken hata:", e);
            setModalMessage("Anket oluşturulurken bir hata oluştu.");
            setShowModal(true);
        }
    };

    // Ankete oy verme işleyicisi
    const handleVote = async (pollMessageId, optionIndex) => {
        if (!db || !userId || !selectedChat) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const messageCollectionRef = selectedChat.type === 'public'
            ? collection(db, `artifacts/${appId}/public/data/messages`)
            : selectedChat.type === 'group'
                ? collection(db, `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`)
                : collection(db, `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`);

        const pollDocRef = doc(messageCollectionRef, pollMessageId);

        try {
            const pollDocSnap = await getDoc(pollDocRef);
            if (pollDocSnap.exists()) {
                const pollData = pollDocSnap.data();
                const updatedOptions = [...pollData.options];

                const hasVoted = pollData.voters && pollData.voters.includes(userId);

                if (hasVoted) {
                    setModalMessage("Bu ankete zaten oy verdiniz!");
                    setShowModal(true);
                    return;
                }

                updatedOptions[optionIndex].votes += 1;

                await updateDoc(pollDocRef, {
                    options: updatedOptions,
                    voters: arrayUnion(userId)
                });
            }
        } catch (e) {
            console.error("Oy verilirken hata:", e);
            setModalMessage("Oy verilirken bir hata oluştu.");
            setShowModal(true);
        }
    };

    // Görüntülü konuşma başlatma (yeni pencerede)
    const startVideoCallInNewWindow = useCallback(async (callId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            // Yeni pencereyi aç ve referansını sakla
            videoCallWindowRef.current = window.open('', '_blank', 'width=800,height=600,noopener,noreferrer');

            if (videoCallWindowRef.current) {
                videoCallWindowRef.current.document.write(`
                    <!DOCTYPE html>
                    <html lang="tr">
                    <head>
                        <title>Görüntülü Konuşma</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Inter', sans-serif; background: linear-gradient(to right, #91EAE4, #86A8E7, #7F7FD5); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; color: white; overflow: hidden; }
                            .video-container { width: 90%; max-width: 700px; background-color: rgba(0, 0, 0, 0.6); border-radius: 15px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); display: flex; flex-direction: column; align-items: center; }
                            video { width: 100%; height: auto; border-radius: 10px; border: 2px solid #60A5FA; margin-bottom: 15px; }
                            .status-text { font-size: 1.25rem; font-weight: 600; margin-bottom: 15px; }
                            .button-group { display: flex; gap: 15px; }
                            button { background-color: #EF4444; color: white; padding: 12px 24px; border-radius: 9999px; font-weight: 600; transition: background-color 0.2s ease-in-out; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                            button:hover { background-color: #DC2626; }
                            button svg { margin-right: 8px; }
                        </style>
                    </head>
                    <body>
                        <div class="video-container">
                            <h1 class="text-3xl font-bold mb-4">Görüntülü Konuşma</h1>
                            <video id="localVideo" autoplay playsinline muted></video>
                            <p id="callStatus" class="status-text">Bağlandı! Diğer kullanıcı bekleniyor...</p>
                            <div class="button-group">
                                <button id="endCallButton">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
                                    Aramayı Sonlandır
                                </button>
                            </div>
                        </div>
                        <script>
                            const localVideo = document.getElementById('localVideo');
                            const endCallButton = document.getElementById('endCallButton');
                            const callStatus = document.getElementById('callStatus');

                            // Stream'i ana pencereden al (veya burada tekrar başlat)
                            // Bu simülasyon için, yeni pencerede kendi kamerasını başlatacak
                            async function setupLocalVideo() {
                                try {
                                    const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                    localVideo.srcObject = newStream;
                                    // Pencere kapanınca stream'i durdur
                                    window.addEventListener('beforeunload', () => {
                                        newStream.getTracks().forEach(track => track.stop());
                                    });
                                } catch (err) {
                                    callStatus.textContent = 'Kamera veya mikrofon erişimi reddedildi/bulunamadı.';
                                    console.error('Video akışı başlatılırken hata:', err);
                                }
                            }
                            setupLocalVideo();

                            endCallButton.onclick = () => {
                                if (window.opener && !window.opener.closed) {
                                    // Ana pencereye aramanın sonlandırıldığını bildir
                                    window.opener.postMessage({ type: 'CALL_ENDED', callId: '${callId}' }, window.location.origin);
                                }
                                window.close(); // Pencereyi kapat
                            };

                            // Ana pencereden mesajları dinle (örneğin arama durum güncellemeleri)
                            window.addEventListener('message', (event) => {
                                if (event.origin !== window.location.origin) return; // Güvenlik kontrolü
                                if (event.data.type === 'CALL_STATUS_UPDATE') {
                                    callStatus.textContent = event.data.message;
                                }
                            });
                        </script>
                    </body>
                    </html>
                `);
                videoCallWindowRef.current.document.close(); // Belge yazmayı bitir

                // Ana pencereden yeni pencereye stream göndermek yerine, yeni pencere kendi stream'ini başlatacak.
                // Bu, WebRTC gibi karmaşık peer-to-peer bağlantıları kurmadan simülasyonu basitleştirir.

                // Yeni pencere kapandığında ana pencereye bildirim gönder
                const checkWindowClosed = setInterval(() => {
                    if (videoCallWindowRef.current && videoCallWindowRef.current.closed) {
                        clearInterval(checkWindowClosed);
                        if (localStream) {
                            localStream.getTracks().forEach(track => track.stop());
                            setLocalStream(null);
                        }
                        // Firestore'daki arama durumunu 'ended' olarak güncelle
                        if (callId && db) {
                            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, callId);
                            updateDoc(callDocRef, { status: 'ended' });
                        }
                        setModalMessage("Görüntülü konuşma sonlandırıldı.");
                        setShowModal(true);
                    }
                }, 1000);

            } else {
                setModalMessage("Görüntülü konuşma penceresi açılamadı. Tarayıcınızın pop-up engelleyicisini kontrol edin.");
                setShowModal(true);
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setModalMessage("Görüntülü arama için kamera ve mikrofon izni reddedildi. Lütfen tarayıcı ayarlarınızdan izin verin.");
            } else if (err.name === 'NotFoundError') {
                setModalMessage("Görüntülü arama için kamera veya mikrofon bulunamadı.");
            } else {
                setModalMessage(`Görüntülü arama başlatılırken bir hata oluştu: ${err.message}`);
            }
            console.error("Görüntülü arama başlatılırken hata:", err);
            setShowModal(true);
        }
        setShowActionMenu(false);
    }, [db, userId, localStream]);

    // Görüntülü konuşmayı sonlandırma (ana pencereden)
    const endVideoCall = useCallback(async (callId) => {
        if (videoCallWindowRef.current) {
            videoCallWindowRef.current.close();
            videoCallWindowRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setShowVideoCallScreen(false);
        setModalMessage("Görüntülü konuşma sonlandırıldı.");
        setShowModal(true);

        // Firestore'daki arama durumunu 'ended' olarak güncelle
        if (callId && db) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, callId);
            await updateDoc(callDocRef, { status: 'ended' });
        }
    }, [db, localStream]);

    // Gelen arama kabul etme
    const handleAcceptCall = async () => {
        if (incomingCallData && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, incomingCallData.callId);
            await updateDoc(callDocRef, { status: 'accepted' });
            setShowCallIncomingModal(false);
            setIncomingCallData(null);
            setModalMessage("Arama kabul edildi. Bağlanılıyor...");
            setShowModal(true);
            // startVideoCallInNewWindow(incomingCallData.callId); // Zaten listener tarafından tetiklenecek
        }
    };

    // Gelen arama reddetme
    const handleRejectCall = async () => {
        if (incomingCallData && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, incomingCallData.callId);
            await updateDoc(callDocRef, { status: 'rejected' });
            setShowCallIncomingModal(false);
            setIncomingCallData(null);
            setModalMessage("Arama reddedildi.");
            setShowModal(true);
            // Arama belgesini Firestore'dan sil
            await deleteDoc(callDocRef);
        }
    };

    // Ana pencereden gelen mesajları dinle (yeni pencereden gelenler dahil)
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return; // Güvenlik kontrolü

            if (event.data.type === 'CALL_ENDED' && event.data.callId) {
                // Yeni pencere kapandığında arama durumunu güncelle
                endVideoCall(event.data.callId);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [endVideoCall]);


    // Canlı konum paylaşma fonksiyonu (simüle edilmiş)
    const shareLiveLocation = () => {
        if (!selectedChat || !db || !userId) {
            setModalMessage("Konum paylaşmak için bir sohbet seçmelisiniz.");
            setShowModal(true);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const locationMessageData = {
            type: 'location',
            text: 'Canlı Konum Paylaşıldı: [Simüle Edilmiş Konum]',
            locationUrl: 'https://www.google.com/maps/place/Antalya', // Örnek bir konum
            senderId: userId,
            senderName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
            timestamp: serverTimestamp(),
            chatType: selectedChat.type,
            chatTargetId: selectedChat.id
        };

        try {
            if (selectedChat.type === 'public') {
                addDoc(collection(db, `artifacts/${appId}/public/data/messages`), locationMessageData);
            } else if (selectedChat.type === 'group') {
                addDoc(collection(db, `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`), locationMessageData);
            } else if (selectedChat.type === 'private') {
                addDoc(collection(db, `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`), locationMessageData);
            }
            setModalMessage("Canlı konumunuz başarıyla paylaşıldı (simülasyon).");
            setShowModal(true);
        } catch (e) {
            console.error("Konum paylaşılırken hata oluştu: ", e);
            setModalMessage("Konum paylaşılırken bir hata oluştu.");
            setShowModal(true);
        }
    };

    // Özel sohbet başlatma fonksiyonu
    const startPrivateChat = (friendId, friendName) => {
        if (!userId) {
            setModalMessage("Özel sohbet başlatmak için giriş yapmalısınız.");
            setShowModal(true);
            return;
        }
        // İki kullanıcı ID'sini sıralayarak benzersiz bir sohbet ID'si oluştur
        const privateChatId = [userId, friendId].sort().join('_');
        setSelectedChat({ id: privateChatId, name: friendName, type: 'private', targetId: friendId });
        setModalMessage(`${friendName} ile özel sohbet başlatıldı.`);
        setShowModal(true);
    };


    // Genel düğme tıklama işleyicisi
    const handleGenericButtonClick = async (buttonName) => {
        if (buttonName === 'Video Arama') {
            if (!userId) {
                setModalMessage("Görüntülü arama başlatmak için giriş yapmalısınız.");
                setShowModal(true);
                return;
            }
            const friendId = prompt("Görüntülü arama yapmak istediğiniz arkadaşın ID'sini girin:");
            if (friendId && friendId.trim() !== '' && db) {
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                try {
                    const friendDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/users`, friendId));
                    if (!friendDoc.exists()) {
                        setModalMessage("Belirtilen ID'ye sahip bir kullanıcı bulunamadı.");
                        setShowModal(true);
                        return;
                    }
                    if (friendId === userId) {
                        setModalMessage("Kendinizi arayamazsınız.");
                        setShowModal(true);
                        return;
                    }

                    // Arama belgesi oluştur
                    const newCallRef = await addDoc(collection(db, `artifacts/${appId}/public/data/calls`), {
                        callerId: userId,
                        calleeId: friendId,
                        status: 'pending',
                        type: 'video',
                        timestamp: serverTimestamp()
                    });
                    setModalMessage(`${friendDoc.data().name} aranıyor...`);
                    setShowModal(true);
                } catch (e) {
                    console.error("Arama başlatılırken hata:", e);
                    setModalMessage("Arama başlatılırken bir hata oluştu.");
                    setShowModal(true);
                }
            } else if (friendId !== null && friendId.trim() === '') {
                setModalMessage("Arkadaş ID'si boş bırakılamaz.");
                setShowModal(true);
            }
        } else if (buttonName === 'Sesli Arama') {
            if (!userId) {
                setModalMessage("Sesli arama başlatmak için giriş yapmalısınız.");
                setShowModal(true);
                return;
            }
            setModalMessage("Sesli arama özelliği henüz geliştirilmedi.");
            setShowModal(true);
            // try {
            //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            //     stream.getTracks().forEach(track => track.stop());
            //     setModalMessage("Sesli arama başlatıldı. Diğer sunuculara davet ediliyor!");
            // } catch (err) {
            //     if (err.name === 'NotAllowedError') {
            //         setModalMessage("Sesli arama için mikrofon izni reddedildi. Lütfen tarayıcı ayarlarınızdan izin verin.");
            //     } else if (err.name === 'NotFoundError') {
            //         setModalMessage("Sesli arama için mikrofon bulunamadı.");
            //     } else {
            //         setModalMessage(`Sesli arama başlatılırken bir hata oluştu: ${err.message}`);
            //     }
            //     console.error("Sesli arama başlatılırken hata:", err);
            // }
            // setShowModal(true);
        } else if (buttonName === 'Dosya Ekle') {
            document.getElementById('fileInput').click();
        } else if (buttonName === 'Profili Görüntüle') {
            setModalMessage("Profil görüntüleme özelliği henüz geliştirilmedi.");
            setShowModal(true);
        } else if (buttonName === 'Yakın Arkadaşlara Ekle') {
            addFriend();
        } else if (buttonName === 'Gruba Ekle') {
            addMemberToGroup();
        } else if (buttonName === 'Engelle') {
            setModalMessage("Kullanıcı engelleme özelliği henüz geliştirilmedi.");
            setShowModal(true);
        } else if (buttonName === 'Anket Oluştur') {
            setShowPollModal(true);
        } else if (buttonName === 'Canlı Konum Paylaş') {
            shareLiveLocation();
        } else if (buttonName === 'Çıkış Yap') {
             if (auth) {
                await signOut(auth);
                setModalMessage("Başarıyla çıkış yapıldı.");
                setShowModal(true);
             }
        } else if (buttonName === 'Uygulamayı İndir') { // handleDownloadApp çağrısı buraya taşındı
            handleDownloadApp();
        }
        setShowActionMenu(false);
    };

    // Uygulamayı indirme seçeneği
    const handleDownloadApp = () => {
        setModalMessage("Bu bir web uygulamasıdır. Tarayıcınızın 'Ana Ekrana Ekle' veya 'Yükle' seçeneğini kullanarak uygulamayı cihazınıza ekleyebilirsiniz.");
        setShowModal(true);
    };


    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-r from-teal-300 via-blue-400 to-indigo-500 text-white text-2xl">
                Yükleniyor...
            </div>
        );
    }

    if (!userId && isAuthReady) {
        return (
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                auth={auth}
                db={db}
                appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}
                setModalMessage={setModalMessage}
                setShowModal={setShowModal}
                onGuestLogin={handleGuestLogin} // Misafir girişi için fonksiyonu geçir
            />
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-r from-teal-300 via-blue-400 to-indigo-500 font-inter">
            <div className="container mx-auto p-4 flex-grow flex items-center justify-center">
                <div className="flex w-full max-w-6xl h-[80vh] rounded-2xl shadow-xl overflow-hidden md:flex-row flex-col">
                    {/* Kişi/Grup listesi bölümü */}
                    <div className="w-full md:w-1/3 bg-gray-900 bg-opacity-30 p-4 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Ara..."
                                className="w-full p-3 pl-10 rounded-full bg-gray-700 bg-opacity-50 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                            {/* Aktif kullanıcı bilgisi */}
                            {currentUser && (
                                <div className="flex items-center p-3 mb-3 rounded-xl bg-gray-700 bg-opacity-50 border border-blue-400">
                                    <div className="relative mr-3">
                                        <img src={currentUser.avatar} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Kullanıcı Resmi" />
                                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
                                    </div>
                                    <div className="flex-grow text-white">
                                        <span className="text-lg font-semibold">{currentUser.name}</span>
                                        <p className="text-sm text-gray-300">{currentUser.status}</p>
                                        {/* Kullanıcı ID'sini göster ve kopyalama butonu ekle */}
                                        <div className="flex items-center">
                                            <p className="text-xs text-gray-400 break-all mr-2">ID: {userId}</p>
                                            <button
                                                onClick={copyUserIdToClipboard}
                                                className="text-xs text-blue-300 hover:text-blue-100 focus:outline-none"
                                                title="Kullanıcı ID'sini kopyala"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleEditUserName()}
                                                className="ml-2 text-xs text-blue-300 hover:text-blue-100 focus:outline-none"
                                                title="Adı Düzenle"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleGenericButtonClick('Hesap Aktarma')}
                                            className="mt-2 text-xs text-blue-300 hover:text-blue-100 focus:outline-none"
                                            title="Hesap Aktarma"
                                        >
                                            Hesap Aktar
                                        </button>
                                        <button
                                            onClick={() => handleGenericButtonClick('Çıkış Yap')}
                                            className="mt-2 text-xs text-red-400 hover:text-red-300 focus:outline-none"
                                            title="Çıkış Yap"
                                        >
                                            Çıkış Yap
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Uygulama İndir Butonu */}
                            <button
                                onClick={() => handleGenericButtonClick('Uygulamayı İndir')}
                                className="w-full mt-4 p-3 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Uygulamayı İndir
                            </button>

                            {/* Genel Sohbet */}
                            <div
                                className={`flex items-center p-3 mb-3 rounded-xl cursor-pointer transition-colors duration-200 ${selectedChat?.id === 'public' ? 'bg-gray-700 bg-opacity-50 border border-blue-400' : 'hover:bg-gray-700 hover:bg-opacity-50'}`}
                                onClick={() => setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' })}
                            >
                                <div className="relative mr-3">
                                    <img src="https://placehold.co/150x150/82ccdd/FFFFFF?text=Genel" className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Genel Sohbet" />
                                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
                                </div>
                                <div className="flex-grow text-white">
                                    <span className="text-lg font-semibold">Genel Sohbet</span>
                                    <p className="text-sm text-gray-300">Herkese açık</p>
                                </div>
                            </div>

                            {/* Gruplar */}
                            <div className="text-white text-lg font-semibold mt-4 mb-2">Gruplar</div>
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className={`flex items-center p-3 mb-3 rounded-xl cursor-pointer transition-colors duration-200 ${selectedChat?.id === group.id ? 'bg-gray-700 bg-opacity-50 border border-blue-400' : 'hover:bg-gray-700 hover:bg-opacity-50'}`}
                                    onClick={() => setSelectedChat({ id: group.id, name: group.name, type: 'group' })}
                                >
                                    <div className="relative mr-3">
                                        <img src={`https://placehold.co/150x150/78e08f/FFFFFF?text=${group.name.substring(0,2).toUpperCase()}`} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Grup Resmi" />
                                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
                                    </div>
                                    <div className="flex-grow text-white">
                                        <span className="text-lg font-semibold">{group.name}</span>
                                        <p className="text-sm text-gray-300">{group.members?.length || 0} Üye</p>
                                    </div>
                                </div>
                            ))}

                            {/* Yeni Grup Oluştur Butonu */}
                            <button
                                onClick={createNewGroup}
                                className="w-full mt-4 p-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m0 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Yeni Grup Oluştur
                            </button>

                            {/* Diğer kişiler (Firestore'dan çekilenler) */}
                            <div className="text-white text-lg font-semibold mt-4 mb-2">Tüm Kullanıcılar</div>
                            {contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center p-3 mb-3 rounded-xl hover:bg-gray-700 hover:bg-opacity-50 transition-colors duration-200 cursor-pointer"
                                    onClick={() => {
                                        setSelectedContactForProfile(contact);
                                        setShowContactProfileModal(true);
                                    }}
                                >
                                    <div className="relative mr-3">
                                        <img src={contact.avatar} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Kişi Resmi" />
                                        <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-900 ${contact.status === 'Çevrimiçi' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </div>
                                    <div className="flex-grow text-white">
                                        <span className="text-lg font-semibold">{contact.name}</span>
                                        <p className="text-sm text-gray-300">{contact.status}</p>
                                        <p className="text-xs text-gray-400 break-all">ID: {contact.id}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Arkadaş Listesi (Basit Gösterim) */}
                            {currentUser?.friends && currentUser.friends.length > 0 && (
                                <div className="text-white text-lg font-semibold mt-4 mb-2">Arkadaşlarım</div>
                            )}
                            {currentUser?.friends.map(friendId => {
                                const friend = contacts.find(c => c.id === friendId);
                                return friend ? (
                                    <div
                                        key={friend.id}
                                        className={`flex items-center p-3 mb-3 rounded-xl cursor-pointer transition-colors duration-200 ${selectedChat?.type === 'private' && selectedChat?.targetId === friend.id ? 'bg-gray-700 bg-opacity-50 border border-blue-400' : 'hover:bg-gray-700 hover:bg-opacity-50'}`}
                                        onClick={() => startPrivateChat(friend.id, friend.name)}
                                    >
                                        <div className="relative mr-3">
                                            <img src={friend.avatar} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Arkadaş Resmi" />
                                            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-900 ${friend.status === 'Çevrimiçi' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </div>
                                        <div className="flex-grow text-white">
                                            <span className="text-lg font-semibold">{friend.name}</span>
                                            <p className="text-sm text-gray-300">{friend.status}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>

                    {/* Sohbet penceresi bölümü */}
                    <div className="w-full md:w-2/3 p-4 flex flex-col rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
                        {/* Sohbet başlığı */}
                        <div className="flex items-center pb-4 border-b border-gray-700 mb-4 relative">
                            <div className="relative mr-3">
                                <img src={selectedChat?.type === 'public' ? 'https://placehold.co/150x150/82ccdd/FFFFFF?text=Genel' : selectedChat?.type === 'private' ? contacts.find(c => c.id === selectedChat.targetId)?.avatar || 'https://placehold.co/150x150/FF6347/FFFFFF?text=Özel' : `https://placehold.co/150x150/78e08f/FFFFFF?text=${selectedChat?.name.substring(0,2).toUpperCase()}` || 'https://placehold.co/150x150/FF6347/FFFFFF?text=??'} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Sohbet Partneri Resmi" />
                                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></span>
                            </div>
                            <div className="flex-grow text-white">
                                <span className="text-xl font-semibold">{selectedChat?.name || 'Sohbet Seçilmedi'}</span>
                                <p className="text-sm text-gray-300">
                                    {selectedChat?.type === 'public' ? 'Herkese açık sohbet' : selectedChat?.type === 'group' ? `${groups.find(g => g.id === selectedChat.id)?.members?.length || 0} Üye` : selectedChat?.type === 'private' ? 'Özel Sohbet' : ''}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4 text-white text-2xl">
                                <svg className="w-6 h-6 cursor-pointer hover:text-blue-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" onClick={() => handleGenericButtonClick('Video Arama')}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.555-4.555A1 1 0 0121 6v12a1 1 0 01-1.445.895L15 14m-5 0v-4m0 4h.01M10 14h.01M10 10h.01M10 10v-4m0 4h.01M10 14h.01M10 10h.01M10 10v-4m0 4h.01M10 14h.01"></path></svg>
                                <svg className="w-6 h-6 cursor-pointer hover:text-blue-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" onClick={() => handleGenericButtonClick('Sesli Arama')}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"></path></svg>
                            </div>
                            {/* Aksiyon menüsü butonu */}
                            <button id="action_menu_btn" className="ml-4 text-white text-2xl focus:outline-none" onClick={() => setShowActionMenu(!showActionMenu)}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                            </button>
                            {/* Aksiyon menüsü */}
                            <div id="action_menu" className={`absolute top-16 right-0 bg-gray-700 bg-opacity-70 text-white rounded-xl shadow-lg py-2 z-10 ${showActionMenu ? '' : 'hidden'}`}>
                                <ul>
                                    <li className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center rounded-lg mx-2" onClick={() => handleGenericButtonClick('Profili Görüntüle')}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        Profili Görüntüle
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center rounded-lg mx-2" onClick={() => handleGenericButtonClick('Yakın Arkadaşlara Ekle')}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2m2-2a4 4 0 108 0H4zm16 0a4 4 0 10-8 0h8z"></path></svg>
                                        Yakın Arkadaşlara Ekle
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center rounded-lg mx-2" onClick={() => handleGenericButtonClick('Gruba Ekle')}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m0 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Gruba Ekle
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center rounded-lg mx-2" onClick={() => handleGenericButtonClick('Anket Oluştur')}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-2m3 2v-2m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        Anket Oluştur
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center rounded-lg mx-2" onClick={() => handleGenericButtonClick('Engelle')}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                                        Engelle
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Mesaj gövdesi */}
                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex mb-4 ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== userId && (
                                        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden mr-2">
                                            <img src={contacts.find(c => c.id === msg.senderId)?.avatar || 'https://placehold.co/150x150/FF6347/FFFFFF?text=User'} className="object-cover w-full h-full" alt="Kullanıcı Resmi" />
                                        </div>
                                    )}
                                    <div className={`relative px-4 py-2 rounded-3xl max-w-[70%] ${msg.senderId === userId ? 'bg-green-500 text-white ml-2' : 'bg-blue-400 text-white mr-2'}`}>
                                        <span className="block text-xs font-bold mb-1">{msg.senderName}</span>
                                        {msg.type === 'poll' ? (
                                            <div className="poll-container">
                                                <p className="font-semibold mb-2">{msg.question}</p>
                                                {msg.options.map((option, index) => (
                                                    <div key={index} className="flex items-center justify-between mb-1">
                                                        <span className="text-sm">{option.text}</span>
                                                        <button
                                                            onClick={() => handleVote(msg.id, index)}
                                                            className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 focus:outline-none"
                                                        >
                                                            Oy Ver ({option.votes})
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : msg.type === 'location' ? (
                                            <div className="location-message">
                                                <p className="font-semibold mb-1">{msg.text}</p>
                                                <a href={msg.locationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline text-sm hover:text-blue-100">
                                                    Haritada Görüntüle
                                                </a>
                                            </div>
                                        ) : (
                                            msg.text
                                        )}
                                        <span className={`absolute text-xs text-gray-200 ${msg.senderId === userId ? 'right-0 -bottom-4' : 'left-0 -bottom-4'}`}>
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                    {msg.senderId === userId && (
                                        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden ml-2">
                                            <img src={currentUser?.avatar || 'https://placehold.co/150x150/FF6347/FFFFFF?text=User'} className="object-cover w-full h-full" alt="Kullanıcı Resmi" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Mesaj gönderme alanı */}
                        <div className="pt-4 border-t border-gray-700 mt-4">
                            <div className="flex items-center bg-gray-700 bg-opacity-50 rounded-full px-4 py-2">
                                <button className="text-white text-xl mr-3 focus:outline-none" onClick={() => handleGenericButtonClick('Dosya Ekle')}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13.5"></path></svg>
                                </button>
                                <button className="text-white text-xl mr-3 focus:outline-none" onClick={() => handleGenericButtonClick('Canlı Konum Paylaş')}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </button>
                                <input
                                    type="file"
                                    id="fileInput"
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (e.target.files.length > 0) {
                                            const file = e.target.files[0];
                                            setModalMessage(`Dosya yükleniyor: ${file.name}...`);
                                            setShowModal(true);
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                            setModalMessage(`Dosya başarıyla yüklendi: ${file.name}`);
                                            setShowModal(true);
                                        }
                                    }}
                                />
                                <textarea
                                    className="flex-grow bg-transparent text-white placeholder-gray-300 focus:outline-none resize-none h-10 overflow-hidden"
                                    placeholder="Mesajınızı yazın..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                />
                                <button className="text-white text-xl ml-3 focus:outline-none" onClick={sendMessage}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Modal bileşeni */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} message={modalMessage} />
            {/* Anket Oluşturma Modal bileşeni */}
            <PollCreationModal isOpen={showPollModal} onClose={() => setShowPollModal(false)} onCreatePoll={handleCreatePoll} setModalMessage={setModalMessage} setShowModal={setShowModal} />
            {/* Kişi Profili Modalı */}
            <ContactProfileModal
                isOpen={showContactProfileModal}
                onClose={() => setShowContactProfileModal(false)}
                contact={selectedContactForProfile}
                onAddFriend={addFriend}
                userId={userId}
                currentUserFriends={currentUser?.friends}
                onStartPrivateChat={startPrivateChat}
            />

            {/* Gelen Arama Modalı */}
            <CallIncomingModal
                isOpen={showCallIncomingModal}
                onClose={() => setShowCallIncomingModal(false)}
                callerName={incomingCallData?.callerName}
                onAccept={handleAcceptCall}
                onReject={handleRejectCall}
            />
        </div>
    );
};

export default App;

