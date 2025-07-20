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
    signOut,
    EmailAuthProvider,
    linkWithCredential
} from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, runTransaction, where, getDocs } from 'firebase/firestore';

// Modal bileşeni
const Modal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-sm w-full relative rounded-xl">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none p-2" // Increased padding for touch target
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

// Welcome Modal
const WelcomeModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-lg w-full relative rounded-xl">
                <h2 className="text-3xl font-bold text-center mb-4">Uygulamaya Hoş Geldiniz!</h2>
                <p className="text-center text-gray-300 mb-6">Sürüm 1.2.0 - Yenilikler</p>
                <ul className="list-disc list-inside space-y-2 mb-8 text-gray-200">
                    <li><b>Dosya İndirme:</b> Paylaşılan dosyaları artık indirebilirsiniz!</li>
                    <li><b>Kullanıcı Puanlama:</b> Diğer kullanıcıların profillerine girerek onlara puan verebilirsiniz.</li>
                    <li><b>Gelişmiş Profil Yönetimi:</b> Profilinizi özel bir ekrandan kolayca düzenleyin.</li>
                    <li><b>Modern Grup Oluşturma:</b> Artık gruplarınızı daha şık bir arayüzle oluşturabilirsiniz.</li>
                    <li><b>Sesli Arama & Tüm Dosya Türleri:</b> Sesli arama yapın ve her türden dosyayı paylaşın!</li>
                </ul>
                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                >
                    Harika! Başlayalım
                </button>
            </div>
        </div>
    );
};

// Profile Edit Modal
const ProfileEditModal = ({ isOpen, onClose, currentUser, onProfileUpdate }) => {
    const [name, setName] = useState(currentUser?.name || '');
    const [avatar, setAvatar] = useState(currentUser?.avatar || '');
    const [tempAvatarFile, setTempAvatarFile] = useState(null); // Yeni: Geçici avatar dosyası

    useEffect(() => {
        if (currentUser && isOpen) { // Sadece modal açıldığında ve currentUser değiştiğinde sıfırla
            setName(currentUser.name);
            setAvatar(currentUser.avatar);
            setTempAvatarFile(null); // Modalı açarken geçici dosyayı sıfırla
        }
    }, [currentUser, isOpen]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTempAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result); // Önizleme için Data URL kullan
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        // Normalde burada tempAvatarFile'ı Firebase Storage'a yüklersiniz
        // Yükleme başarılı olduktan sonra, dönen URL'yi onProfileUpdate'e geçirirsiniz.
        // Şu an için simülasyon yapıyoruz ve doğrudan Data URL'yi kullanıyoruz veya mevcut URL'yi koruyoruz.
        onProfileUpdate(name, avatar); // avatar artık ya Data URL ya da mevcut URL
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-2xl font-bold mb-4">Profili Düzenle</h2>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Kullanıcı Adı:</label>
                    <input
                        type="text"
                        className="w-full p-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Avatar:</label>
                    <div className="flex items-center space-x-4">
                        <img src={avatar || 'https://placehold.co/150x150/7f8c8d/ffffff?text=?'} className="w-20 h-20 rounded-full object-cover border-2 border-blue-400" alt="Avatar Önizleme" />
                        <label htmlFor="avatar-upload" className="cursor-pointer bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Galeriden Seç
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Gerçek bir uygulamada bu resim Firebase Storage'a yüklenir.</p>
                </div>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">İptal</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Kaydet</button>
                </div>
            </div>
        </div>
    );
};

// Group Creation Modal
const GroupCreationModal = ({ isOpen, onClose, onCreateGroup, existingGroupNames }) => {
    const [groupName, setGroupName] = useState('');
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (groupName.trim() && existingGroupNames.includes(groupName.trim().toLowerCase())) {
            setNameError('Bu grup adı zaten kullanılıyor.');
        } else {
            setNameError('');
        }
    }, [groupName, existingGroupNames]);

    if (!isOpen) return null;

    const handleCreate = () => {
        if (groupName.trim() && !nameError) {
            onCreateGroup(groupName.trim());
            setGroupName('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-2xl font-bold mb-4">Yeni Grup Oluştur</h2>
                <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Grup Adı:</label>
                    <input
                        type="text"
                        className={`w-full p-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 ${nameError ? 'border border-red-500' : 'focus:ring-blue-400'}`}
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Grubunuza bir isim verin..."
                    />
                    {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
                </div>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">İptal</button>
                    <button onClick={handleCreate} disabled={!groupName.trim() || !!nameError} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">Oluştur</button>
                </div>
            </div>
        </div>
    );
};

// Star Rating Component
const StarRating = ({ rating, onRating }) => {
    const [hoverRating, setHoverRating] = useState(0);
    return (
        <div className="flex justify-center items-center space-x-1 my-4">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors duration-200 ${ (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-500'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    onClick={() => onRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};


// Contact Profile Modal
const ContactProfileModal = ({ isOpen, onClose, contact, onAddFriend, userId, currentUserFriends, onStartPrivateChat, onRateUser, onCommentSubmit, onStartCall, onReportUser, db, appId }) => {
    const [rating, setRating] = useState(0);
    const [newCommentText, setNewCommentText] = useState('');
    const [contactComments, setContactComments] = useState([]);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const isFriend = currentUserFriends?.includes(contact?.id);
    const isSelf = userId === contact?.id;
    const averageRating = contact?.averageRating ? contact.averageRating.toFixed(1) : 'Puanlanmadı';

    useEffect(() => {
        if (!db || !contact?.id || !isOpen) {
            setContactComments([]);
            return;
        }

        const commentsQuery = query(
            collection(db, `artifacts/${appId}/public/data/users`, contact.id, 'comments'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleString('tr-TR') || 'Şimdi'
            }));
            setContactComments(fetchedComments);
        }, (error) => {
            console.error("Yorumları dinlerken hata oluştu:", error);
        });

        return () => unsubscribe();
    }, [db, contact?.id, isOpen, appId]);

    if (!isOpen || !contact) return null;

    const handleCommentSubmit = () => {
        if (newCommentText.trim()) {
            onCommentSubmit(contact.id, newCommentText.trim());
            setNewCommentText('');
        }
    };

    const handleReportSubmit = () => {
        if (reportReason.trim()) {
            onReportUser(contact.id, reportReason.trim());
            setReportReason('');
            setShowReportForm(false);
            onClose(); // Close modal after reporting
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-sm w-full relative rounded-xl text-center">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none p-2"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <img src={contact.avatar} className="w-24 h-24 rounded-full border-4 border-blue-400 mx-auto mb-4 object-cover" alt="Kişi Resmi" />
                <h2 className="text-2xl font-bold mb-1">{contact.name}</h2>
                <p className="text-yellow-400 mb-2">★ {averageRating}</p>
                <p className="text-gray-300 mb-2">{contact.status}</p>
                <p className="text-sm text-gray-400 break-all mb-4">ID: {contact.id}</p>
                
                {!isSelf && (
                    <>
                        <div className="border-t border-gray-700 my-4"></div>
                        <h3 className="text-lg font-semibold mb-2">Bu Kullanıcıyı Puanla</h3>
                        <StarRating rating={rating} onRating={setRating} />
                        <button
                            onClick={() => {
                                onRateUser(contact.id, rating);
                                setRating(0);
                            }}
                            disabled={rating === 0}
                            className="w-full py-2 mb-4 rounded-md font-semibold bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none"
                        >
                            Puan Ver
                        </button>
                        <div className="border-t border-gray-700 my-4"></div>
                        <h3 className="text-lg font-semibold mb-2">Yorumlar</h3>
                        <div className="max-h-32 overflow-y-auto custom-scrollbar text-left mb-4 p-2 bg-gray-700 rounded-md">
                            {contactComments.length > 0 ? (
                                contactComments.map(comment => (
                                    <div key={comment.id} className="mb-2 pb-2 border-b border-gray-600 last:border-b-0">
                                        <p className="text-sm font-semibold text-blue-300">{comment.commenterName}</p>
                                        <p className="text-sm text-gray-200">{comment.text}</p>
                                        <p className="text-xs text-gray-400 text-right">{comment.timestamp}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center">Henüz yorum yok.</p>
                            )}
                        </div>
                        <div className="mb-4">
                            <textarea
                                className="w-full p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                rows="3"
                                placeholder="Bir yorum yazın..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                            ></textarea>
                            <button
                                onClick={handleCommentSubmit}
                                disabled={!newCommentText.trim()}
                                className="w-full mt-2 py-2 rounded-md font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none"
                            >
                                Yorum Yap
                            </button>
                        </div>
                        <div className="border-t border-gray-700 my-4"></div>
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
                                <>
                                    <button
                                        onClick={() => {
                                            onStartPrivateChat(contact.id, contact.name);
                                            onClose();
                                        }}
                                        className="w-full py-2 rounded-md font-semibold bg-green-600 hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                                    >
                                        Özel Sohbet Başlat
                                    </button>
                                    <button
                                        onClick={() => onStartCall(contact.id, 'video')}
                                        className="w-full py-2 rounded-md font-semibold bg-purple-600 hover:bg-purple-700 transition-colors duration-200 focus:outline-none"
                                    >
                                        Görüntülü Ara
                                    </button>
                                    <button
                                        onClick={() => onStartCall(contact.id, 'audio')}
                                        className="w-full py-2 rounded-md font-semibold bg-orange-600 hover:bg-orange-700 transition-colors duration-200 focus:outline-none"
                                    >
                                        Sesli Ara
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowReportForm(!showReportForm)}
                                className="w-full py-2 rounded-md font-semibold bg-red-600 hover:bg-red-700 transition-colors duration-200 focus:outline-none"
                            >
                                {showReportForm ? 'Şikayet Formunu Kapat' : 'Şikayet Et'}
                            </button>
                            {showReportForm && (
                                <div className="mt-4 p-3 bg-gray-700 rounded-md">
                                    <textarea
                                        className="w-full p-2 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                                        rows="3"
                                        placeholder="Şikayet sebebini girin..."
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                    ></textarea>
                                    <button
                                        onClick={handleReportSubmit}
                                        disabled={!reportReason.trim()}
                                        className="w-full py-2 rounded-md font-semibold bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        Şikayeti Gönder
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
                {isSelf && (
                    <>
                        <div className="border-t border-gray-700 my-4"></div>
                        <h3 className="text-lg font-semibold mb-2">Puanınız</h3>
                        <p className="text-yellow-400 text-4xl font-bold mb-4">★ {averageRating}</p>
                        <h3 className="text-lg font-semibold mb-2">Hakkınızdaki Yorumlar</h3>
                        <div className="max-h-32 overflow-y-auto custom-scrollbar text-left mb-4 p-2 bg-gray-700 rounded-md">
                            {contactComments.length > 0 ? (
                                contactComments.map(comment => (
                                    <div key={comment.id} className="mb-2 pb-2 border-b border-gray-600 last:border-b-0">
                                        <p className="text-sm font-semibold text-blue-300">{comment.commenterName}</p>
                                        <p className="text-sm text-gray-200">{comment.text}</p>
                                        <p className="text-xs text-gray-400 text-right">{comment.timestamp}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center">Henüz yorum yok.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Auth Modal
const AuthModal = ({ isOpen, onClose, auth, db, appId, setModalMessage, setShowModal, onGuestLogin }) => {
    const [authMethod, setAuthMethod] = useState('email');
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

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
                    if (auth.currentUser && auth.currentUser.isAnonymous) {
                        try {
                            const credential = EmailAuthProvider.credential(email, password);
                            const userCredential = await linkWithCredential(auth.currentUser, credential);
                            await sendEmailVerification(userCredential.user);
                            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid);
                            await updateDoc(userDocRef, {
                                name: name || `Kullanıcı ${userCredential.user.uid.substring(0, 6)}`,
                                email: email,
                                isEmailVerified: false,
                            });
                            setModalMessage("Hesabınız e-posta ile bağlandı ve oluşturuldu! Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.");
                        } catch (linkError) {
                            let linkErrorMessage = "Hesap bağlanırken bir hata oluştu.";
                            if (linkError.code === 'auth/credential-already-in-use' || linkError.code === 'auth/email-already-in-use') {
                                linkErrorMessage = "Bu e-posta adresi zaten başka bir hesaba bağlı.";
                            }
                            setModalMessage(linkErrorMessage);
                            setShowModal(true);
                            return;
                        }
                    } else {
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
                            friends: [],
                            ratings: [],
                            ratedBy: [],
                            averageRating: 0,
                        });
                        setModalMessage("Hesabınız oluşturuldu! Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.");
                        await signOut(auth);
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
        } catch (error) {
            setModalMessage("Misafir olarak giriş yapılırken bir hata oluştu.");
            setShowModal(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-3xl font-bold text-center mb-6">Giriş Yap / Kayıt Ol</h2>
                 <div className="flex justify-center mb-6 space-x-4">
                    <button
                        className={`px-4 py-2 rounded-md font-semibold ${authMethod === 'email' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        onClick={() => setAuthMethod('email')}
                    >
                        E-posta
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md font-semibold ${authMethod === 'guest' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        onClick={() => setAuthMethod('guest')}
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
const CallIncomingModal = ({ isOpen, onClose, callerName, onAccept, onReject, callType }) => {
    if (!isOpen) return null;
    const callTypeText = callType === 'video' ? 'Görüntülü' : 'Sesli';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-sm w-full relative rounded-xl text-center">
                <h2 className="text-2xl font-bold mb-4">{callerName} sizi arıyor...</h2>
                <p className="text-gray-300 mb-6">{callTypeText} arama daveti.</p>
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

// Invite Member Modal
const InviteMemberModal = ({ isOpen, onClose, groupId, groupName, members, contacts, onInviteMember }) => {
    if (!isOpen) return null;

    const availableContacts = contacts.filter(contact => !members.includes(contact.id));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-2xl font-bold mb-4">Üye Davet Et: {groupName}</h2>
                <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                    {availableContacts.length > 0 ? (
                        availableContacts.map(contact => (
                            <div key={contact.id} className="flex items-center justify-between p-2 mb-2 bg-gray-700 rounded-md">
                                <div className="flex items-center">
                                    <img src={contact.avatar} className="w-10 h-10 rounded-full mr-3" alt="Kullanıcı" />
                                    <span>{contact.name}</span>
                                </div>
                                <button
                                    onClick={() => onInviteMember(groupId, contact.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                                >
                                    Davet Et
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center">Davet edilebilecek başka kullanıcı yok.</p>
                    )}
                </div>
                <div className="flex justify-end">
                    <button onClick={onClose} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">Kapat</button>
                </div>
            </div>
        </div>
    );
};

// Manage Group Members Modal
const ManageGroupMembersModal = ({ isOpen, onClose, group, contacts, onRemoveMember, onBanMember, onUnbanMember, onPromoteAdmin, onDemoteAdmin, currentUserId }) => {
    if (!isOpen || !group) return null;

    const isAdmin = group.adminIds && group.adminIds.includes(currentUserId);
    const maxAdminsReached = group.adminIds && group.adminIds.length >= 3;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl">
                <h2 className="text-2xl font-bold mb-4">Üyeleri Yönet: {group.name}</h2>
                <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4">
                    <h3 className="text-lg font-semibold mb-2">Üyeler</h3>
                    {group.members.length > 0 ? (
                        group.members.map(memberId => {
                            const member = contacts.find(c => c.id === memberId) || { id: memberId, name: `Bilinmeyen Kullanıcı (${memberId.substring(0, 6)})`, avatar: 'https://placehold.co/150x150/7f8c8d/ffffff?text=?' };
                            const isBanned = group.bannedMembers && group.bannedMembers.includes(memberId);
                            const isMemberAdmin = group.adminIds && group.adminIds.includes(memberId);
                            const canManage = isAdmin && memberId !== currentUserId; // Admin can manage others, not self

                            return (
                                <div key={member.id} className="flex items-center justify-between p-2 mb-2 bg-gray-700 rounded-md">
                                    <div className="flex items-center">
                                        <img src={member.avatar} className="w-10 h-10 rounded-full mr-3" alt="Kullanıcı" />
                                        <span>
                                            {member.name}
                                            {isMemberAdmin && ' (Yönetici)'}
                                            {isBanned && ' (Yasaklı)'}
                                        </span>
                                    </div>
                                    {canManage && (
                                        <div className="flex space-x-2">
                                            {isMemberAdmin ? (
                                                <button
                                                    onClick={() => onDemoteAdmin(group.id, member.id)}
                                                    className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                                                >
                                                    Yöneticilikten Al
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onPromoteAdmin(group.id, member.id)}
                                                    className={`bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm ${maxAdminsReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={maxAdminsReached}
                                                >
                                                    Yönetici Yap
                                                </button>
                                            )}
                                            {isBanned ? (
                                                <button
                                                    onClick={() => onUnbanMember(group.id, member.id)}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                                                >
                                                    Yasağı Kaldır
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onBanMember(group.id, member.id)}
                                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
                                                >
                                                    Yasakla
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onRemoveMember(group.id, member.id)}
                                                className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 text-sm"
                                            >
                                                Çıkar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-400 text-center">Bu grupta henüz üye yok.</p>
                    )}
                </div>
                <div className="flex justify-end">
                    <button onClick={onClose} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">Kapat</button>
                </div>
            </div>
        </div>
    );
};


// Help Center Modal
const HelpCenterModal = ({ isOpen, onClose, userId, currentUser, db, appId, setModalMessage, setShowModal, ADMIN_ID }) => {
    const [helpCenterComments, setHelpCenterComments] = useState([]);
    const [newHelpCenterCommentText, setNewHelpCenterCommentText] = useState('');
    const [surveys, setSurveys] = useState([]);
    const [showCreateSurveyForm, setShowCreateSurveyForm] = useState(false);
    const [newSurveyTitle, setNewSurveyTitle] = useState('');
    const [newSurveyQuestions, setNewSurveyQuestions] = useState([{ questionText: '', options: [''] }]);

    const isAdmin = userId === ADMIN_ID;

    useEffect(() => {
        if (!db || !isOpen) {
            setHelpCenterComments([]);
            setSurveys([]);
            return;
        }

        // Listen for Help Center Comments
        const commentsQuery = query(
            collection(db, `artifacts/${appId}/public/data/help_center_comments`),
            orderBy('timestamp', 'desc')
        );
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleString('tr-TR') || 'Şimdi',
                commenterName: doc.data().commenterId === ADMIN_ID ? 'ADMİN' : doc.data().commenterName
            }));
            setHelpCenterComments(fetchedComments);
        }, (error) => {
            console.error("Yardım merkezi yorumlarını dinlerken hata oluştu:", error);
        });

        // Listen for Surveys
        const surveysQuery = query(
            collection(db, `artifacts/${appId}/public/data/surveys`),
            orderBy('createdAt', 'desc')
        );
        const unsubscribeSurveys = onSnapshot(surveysQuery, (snapshot) => {
            const fetchedSurveys = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toLocaleString('tr-TR') || 'Şimdi'
            }));
            setSurveys(fetchedSurveys);
        }, (error) => {
            console.error("Anketleri dinlerken hata oluştu:", error);
        });

        return () => {
            unsubscribeComments();
            unsubscribeSurveys();
        };
    }, [db, isOpen, appId, ADMIN_ID]);

    if (!isOpen) return null;

    const handleAddHelpCenterComment = async () => {
        if (!newHelpCenterCommentText.trim()) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/help_center_comments`), {
                commenterId: userId,
                commenterName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
                text: newHelpCenterCommentText.trim(),
                timestamp: serverTimestamp(),
            });
            setNewHelpCenterCommentText('');
            setModalMessage("Yorumunuz başarıyla eklendi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Yorum eklenirken bir hata oluştu.");
            setShowModal(true);
            console.error("Yorum eklenirken hata:", e);
        }
    };

    const handleAddQuestion = () => {
        setNewSurveyQuestions([...newSurveyQuestions, { questionText: '', options: [''] }]);
    };

    const handleQuestionTextChange = (index, value) => {
        const updatedQuestions = [...newSurveyQuestions];
        updatedQuestions[index].questionText = value;
        setNewSurveyQuestions(updatedQuestions);
    };

    const handleAddOption = (questionIndex) => {
        const updatedQuestions = [...newSurveyQuestions];
        updatedQuestions[questionIndex].options.push('');
        setNewSurveyQuestions(updatedQuestions);
    };

    const handleOptionTextChange = (questionIndex, optionIndex, value) => {
        const updatedQuestions = [...newSurveyQuestions];
        updatedQuestions[questionIndex].options[optionIndex] = value;
        setNewSurveyQuestions(updatedQuestions);
    };

    const handleCreateSurvey = async () => {
        if (!newSurveyTitle.trim() || newSurveyQuestions.some(q => !q.questionText.trim() || q.options.some(opt => !opt.trim()))) {
            setModalMessage("Lütfen tüm anket alanlarını doldurun.");
            setShowModal(true);
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/surveys`), {
                title: newSurveyTitle.trim(),
                questions: newSurveyQuestions.map(q => ({
                    questionText: q.questionText.trim(),
                    options: q.options.map(opt => opt.trim())
                })),
                creatorId: userId,
                createdAt: serverTimestamp(),
                responses: {} // Store responses as { userId: { questionIndex: selectedOptionIndex } }
            });
            setNewSurveyTitle('');
            setNewSurveyQuestions([{ questionText: '', options: [''] }]);
            setShowCreateSurveyForm(false);
            setModalMessage("Anket başarıyla oluşturuldu!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Anket oluşturulurken bir hata oluştu.");
            setShowModal(true);
            console.error("Anket oluşturulurken hata:", e);
        }
    };

    const handleSurveyResponse = async (surveyId, questionIndex, selectedOption) => {
        if (!db || !userId) return;
        try {
            const surveyRef = doc(db, `artifacts/${appId}/public/data/surveys`, surveyId);
            await updateDoc(surveyRef, {
                [`responses.${userId}.${questionIndex}`]: selectedOption
            });
            setModalMessage("Anket cevabınız kaydedildi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Anket cevabı kaydedilirken bir hata oluştu.");
            setShowModal(true);
            console.error("Anket cevabı kaydedilirken hata:", e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar"> {/* Added max-h and overflow-y */}
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none p-2" // Increased padding for touch target
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center">Yardım Merkezi</h2>
                <div className="text-left mb-4">
                    <h3 className="text-lg font-semibold mb-2">Sıkça Sorulan Sorular</h3>
                    <p className="mb-2"><b>1. Profilimi nasıl düzenlerim?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Sol üstteki profil resminize tıklayın ve 'Profili Düzenle' seçeneğini kullanın. Buradan adınızı ve avatarınızı değiştirebilirsiniz.</p>
                    
                    <p className="mb-2"><b>2. Yeni bir grup nasıl oluşturulur?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Sol paneldeki 'Gruplar' başlığının yanındaki '+' simgesine tıklayın ve grup adını girin. Grup adı benzersiz olmalıdır.</p>

                    <p className="mb-2"><b>3. Gruba nasıl üye davet ederim?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Bir grup sohbeti seçtikten sonra, sohbet başlığının yanındaki 'Davet Et' butonuna tıklayarak diğer kullanıcıları davet edebilirsiniz.</p>
                    
                    <p className="mb-2"><b>4. Sesli mesaj nasıl gönderilir?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Mesaj yazma alanının solundaki mikrofon simgesine tıklayarak ses kaydını başlatın. Bitirmek için tekrar tıklayın.</p>

                    <p className="mb-2"><b>5. Mesajları nasıl silerim?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Kendi gönderdiğiniz mesajların üzerine gelin ve çıkan çöp kutusu simgesine tıklayın. Bir onay penceresi görünecektir.</p>

                    <p className="mb-2"><b>6. Neden bazı gruplara katılamıyorum?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Gruplar özeldir ve yalnızca davet edilen üyeler katılabilir. Bir gruba davet edilmediyseniz, mesajları göremez veya gönderemezsiniz.</p>

                    <p className="mb-2"><b>7. Kullanıcı ID'mi nasıl kopyalarım?</b></p>
                    <p className="text-gray-300 ml-4 mb-4">Profil resminizin altındaki ID'nize tıklayarak panoya kopyalayabilirsiniz.</p>
                </div>

                <div className="border-t border-gray-700 my-4"></div>
                <h3 className="text-lg font-semibold mb-2">Yardım Merkezi Yorumları</h3>
                <div className="max-h-32 overflow-y-auto custom-scrollbar text-left mb-4 p-2 bg-gray-700 rounded-md">
                    {helpCenterComments.length > 0 ? (
                        helpCenterComments.map(comment => (
                            <div key={comment.id} className="mb-2 pb-2 border-b border-gray-600 last:border-b-0">
                                <p className="text-sm font-semibold text-blue-300">{comment.commenterName}</p>
                                <p className="text-sm text-gray-200">{comment.text}</p>
                                <p className="text-xs text-gray-400 text-right">{comment.timestamp}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center">Henüz yorum yok.</p>
                    )}
                </div>
                <div className="mb-4">
                    <textarea
                        className="w-full p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        rows="3"
                        placeholder="Bir yorum yazın..."
                        value={newHelpCenterCommentText}
                        onChange={(e) => setNewHelpCenterCommentText(e.target.value)}
                    ></textarea>
                    <button
                        onClick={handleAddHelpCenterComment}
                        disabled={!newHelpCenterCommentText.trim()}
                        className="w-full mt-2 py-2 rounded-md font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none"
                    >
                        Yorum Yap
                    </button>
                </div>

                <div className="border-t border-gray-700 my-4"></div>
                <h3 className="text-lg font-semibold mb-2">Anketler</h3>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreateSurveyForm(!showCreateSurveyForm)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 mb-4"
                    >
                        {showCreateSurveyForm ? 'Anket Oluşturmayı Kapat' : 'Yeni Anket Oluştur'}
                    </button>
                )}

                {showCreateSurveyForm && isAdmin && (
                    <div className="p-4 bg-gray-700 rounded-md mb-4">
                        <h4 className="text-xl font-bold mb-3">Yeni Anket Oluştur</h4>
                        <div className="mb-3">
                            <label className="block text-gray-300 text-sm font-bold mb-1">Anket Başlığı:</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={newSurveyTitle}
                                onChange={(e) => setNewSurveyTitle(e.target.value)}
                                placeholder="Anket başlığını girin..."
                            />
                        </div>
                        {newSurveyQuestions.map((q, qIndex) => (
                            <div key={qIndex} className="mb-4 p-3 border border-gray-600 rounded-md">
                                <label className="block text-gray-300 text-sm font-bold mb-1">Soru {qIndex + 1}:</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                                    value={q.questionText}
                                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                                    placeholder="Soruyu girin..."
                                />
                                {q.options.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center mb-2">
                                        <input
                                            type="text"
                                            className="flex-grow p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 mr-2"
                                            value={option}
                                            onChange={(e) => handleOptionTextChange(qIndex, optIndex, e.target.value)}
                                            placeholder={`Seçenek ${optIndex + 1}`}
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => handleAddOption(qIndex)}
                                    className="w-full bg-gray-500 text-white py-1 rounded-md hover:bg-gray-600 text-sm mt-2"
                                >
                                    Seçenek Ekle
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handleAddQuestion}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 mb-4"
                        >
                            Soru Ekle
                        </button>
                        <button
                            onClick={handleCreateSurvey}
                            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                        >
                            Anketi Oluştur
                        </button>
                    </div>
                )}

                {surveys.length > 0 ? (
                    surveys.map(survey => (
                        <div key={survey.id} className="p-3 mb-4 bg-gray-700 rounded-md text-white">
                            <h4 className="text-xl font-bold mb-2">{survey.title}</h4>
                            <p className="text-xs text-gray-400 mb-3">Oluşturan: {survey.creatorId === ADMIN_ID ? 'ADMİN' : survey.creatorId} - {survey.createdAt}</p>
                            {survey.questions.map((q, qIndex) => (
                                <div key={qIndex} className="mb-3">
                                    <p className="font-semibold mb-1">{q.questionText}</p>
                                    {q.options.map((option, optIndex) => (
                                        <label key={optIndex} className="flex items-center text-sm mb-1">
                                            <input
                                                type="radio"
                                                name={`survey-${survey.id}-q-${qIndex}`}
                                                value={option}
                                                onChange={() => handleSurveyResponse(survey.id, qIndex, option)}
                                                checked={survey.responses?.[userId]?.[qIndex] === option}
                                                className="mr-2"
                                                disabled={survey.responses?.[userId]?.[qIndex] !== undefined} // Disable if user already responded
                                            />
                                            {option}
                                        </label>
                                    ))}
                                    {survey.responses?.[userId]?.[qIndex] && (
                                        <p className="text-xs text-green-400 mt-1">Cevabınız: {survey.responses[userId][qIndex]}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-400 text-center">Henüz aktif anket yok.</p>
                )}

                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Kapat</button>
                </div>
            </div>
        </div>
    );
};

// Right Panel for Notifications and Comments
const RightPanel = ({ isOpen, onClose, unreadMessagesCount, myComments, onSelectChatFromNotification, groups, contacts, currentUserId, isAdmin, adminReports, onUpdateReportStatus, onOpenAdminBanModal, onOpenAdminWarningModal }) => {
    if (!isOpen) return null;

    const getChatNameById = (chatId) => {
        if (chatId === 'public') return 'Genel Sohbet';
        const group = groups.find(g => g.id === chatId);
        if (group) return group.name;
        
        // For private chats, the chatId is a sorted combination of two user IDs.
        const userIds = chatId.split('_');
        const otherUserId = userIds.find(id => id !== currentUserId);
        const otherUser = contacts.find(c => c.id === otherUserId);
        return otherUser ? `Özel Sohbet: ${otherUser.name}` : `Bilinmeyen Sohbet (${chatId.substring(0, 6)})`;
    };

    return (
        <div className="w-full md:w-1/3 bg-gray-900 bg-opacity-30 p-4 flex flex-col rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700 mb-4">
                <h2 className="text-xl font-bold text-white">Bildirimler & Yorumlar</h2>
                <button
                    className="text-gray-400 hover:text-white focus:outline-none p-2" // Increased padding for touch target
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                <h3 className="text-lg font-semibold text-white mb-2">Okunmamış Mesajlar ({Object.values(unreadMessagesCount).reduce((acc, curr) => acc + curr, 0)})</h3>
                {Object.keys(unreadMessagesCount).length > 0 ? (
                    Object.entries(unreadMessagesCount).map(([chatId, count]) => count > 0 && (
                        <div 
                            key={chatId} 
                            className="flex items-center justify-between p-3 mb-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600"
                            onClick={() => onSelectChatFromNotification(chatId)}
                        >
                            <span className="text-white">{getChatNameById(chatId)}</span>
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">{count}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-sm">Hiç okunmamış mesajınız yok.</p>
                )}

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Hakkımdaki Yorumlar</h3>
                {myComments.length > 0 ? (
                    myComments.map(comment => (
                        <div key={comment.id} className="p-3 mb-2 bg-gray-700 rounded-md">
                            <p className="text-sm font-semibold text-blue-300">{comment.commenterName}</p>
                            <p className="text-sm text-gray-200">{comment.text}</p>
                            <p className="text-xs text-gray-400 text-right">{comment.timestamp}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-sm">Henüz hakkınızda yorum yok.</p>
                )}

                {isAdmin && (
                    <>
                        <h3 className="text-lg font-semibold text-white mt-6 mb-2">Şikayetler ({adminReports.filter(r => r.status === 'pending').length})</h3>
                        {adminReports.length > 0 ? (
                            adminReports.map(report => {
                                const reporter = contacts.find(c => c.id === report.reporterId) || { name: `Bilinmeyen (${report.reporterId.substring(0,6)})` };
                                const reported = contacts.find(c => c.id === report.reportedUserId) || { name: `Bilinmeyen (${report.reportedUserId.substring(0,6)})` };
                                return (
                                    <div key={report.id} className={`p-3 mb-2 rounded-md ${report.status === 'pending' ? 'bg-red-700' : 'bg-gray-700'}`}>
                                        <p className="text-sm font-semibold text-white">Şikayet Eden: {reporter.name}</p>
                                        <p className="text-sm font-semibold text-white">Şikayet Edilen: {reported.name} (ID: {report.reportedUserId})</p>
                                        <p className="text-sm text-gray-200 mt-1">Sebep: {report.reason}</p>
                                        <p className="text-xs text-gray-400 text-right">{new Date(report.timestamp).toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-gray-400 text-right">Durum: {report.status === 'pending' ? 'Beklemede' : 'İncelendi'}</p>
                                        {report.status === 'pending' && (
                                            <div className="flex justify-end space-x-2 mt-2">
                                                <button
                                                    onClick={() => onUpdateReportStatus(report.id, 'reviewed')}
                                                    className="bg-green-500 text-white text-xs px-2 py-1 rounded-md hover:bg-green-600"
                                                >
                                                    İncelendi Olarak İşaretle
                                                </button>
                                                <button
                                                    onClick={() => onOpenAdminWarningModal(report.reportedUserId)}
                                                    className="bg-orange-500 text-white text-xs px-2 py-1 rounded-md hover:bg-orange-600"
                                                >
                                                    Uyar
                                                </button>
                                                <button
                                                    onClick={() => onOpenAdminBanModal(report.reportedUserId)}
                                                    className="bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
                                                >
                                                    Yasakla
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-400 text-sm">Henüz şikayet yok.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Settings Panel
const SettingsPanel = ({ isOpen, onClose, currentUser, onUpdateUserSettings, onSelectMode, onOpenAdminBanModal, onOpenAdminWarningModal, isAdmin }) => {
    if (!isOpen) return null;

    const handleBackup = () => {
        const now = new Date();
        onUpdateUserSettings({ lastBackupTime: now.toISOString() });
    };

    return (
        <div className="w-full md:w-1/3 bg-gray-900 bg-opacity-30 p-4 flex flex-col rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700 mb-4">
                <h2 className="text-xl font-bold text-white">Ayarlar</h2>
                <button
                    className="text-gray-400 hover:text-white focus:outline-none p-2" // Increased padding for touch target
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                <h3 className="text-lg font-semibold text-white mb-2">Sohbet Yedekleme</h3>
                <div className="p-3 mb-4 bg-gray-700 rounded-md text-white">
                    <p className="text-sm mb-2">Son Yedekleme: {currentUser?.lastBackupTime ? new Date(currentUser.lastBackupTime).toLocaleString('tr-TR') : 'Hiç'}</p>
                    <button
                        onClick={handleBackup}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                    >
                        Şimdi Yedekle
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Yedekleme Google hesabınıza bağlı olduğundan e-posta doğrulaması gerekmez.</p>
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Cihaz Modu</h3>
                <div className="p-3 mb-4 bg-gray-700 rounded-md text-white flex flex-col space-y-2">
                    <button
                        onClick={() => onSelectMode('desktop')}
                        className={`w-full py-2 rounded-md font-semibold ${currentUser?.deviceMode === 'desktop' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors duration-200 focus:outline-none`}
                    >
                        Masaüstü Modu
                    </button>
                    <button
                        onClick={() => onSelectMode('phone')}
                        className={`w-full py-2 rounded-md font-semibold ${currentUser?.deviceMode === 'phone' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors duration-200 focus:outline-none`}
                    >
                        Telefon Modu
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Mevcut Mod: {currentUser?.deviceMode === 'phone' ? 'Telefon' : 'Masaüstü'}</p>
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Arama Geçmişi</h3>
                <div className="p-3 mb-4 bg-gray-700 rounded-md text-white max-h-40 overflow-y-auto custom-scrollbar">
                    {currentUser?.callHistory && currentUser.callHistory.length > 0 ? (
                        currentUser.callHistory.map((call, index) => (
                            <div key={index} className="mb-2 pb-2 border-b border-gray-600 last:border-b-0">
                                <p className="text-sm font-semibold">{call.type === 'video' ? 'Görüntülü' : 'Sesli'} Arama</p>
                                <p className="text-xs text-gray-300">
                                    {call.callerId === currentUser.id ? 'Giden' : 'Gelen'} - {call.partnerName} ({call.status})
                                </p>
                                <p className="text-xs text-gray-400 text-right">{new Date(call.timestamp).toLocaleString('tr-TR')}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center">Henüz arama geçmişi yok.</p>
                    )}
                </div>
                {isAdmin && (
                    <div className="mt-6 flex flex-col space-y-2">
                        <button
                            onClick={onOpenAdminBanModal}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                        >
                            Kullanıcı Yasakla / Yasağı Kaldır
                        </button>
                        <button
                            onClick={onOpenAdminWarningModal}
                            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700"
                        >
                            Kullanıcı Uyar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Admin Ban Modal
const AdminBanModal = ({ isOpen, onClose, db, appId, setModalMessage, setShowModal, contacts, onBanUser, onUnbanUser, preselectedUserId = null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('permanent'); // 'permanent' or 'YYYY-MM-DD'

    const filteredUsers = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || contact.id.includes(searchTerm)
    );

    useEffect(() => {
        if (isOpen) {
            if (preselectedUserId) {
                const user = contacts.find(c => c.id === preselectedUserId);
                if (user) {
                    handleSelectUser(user);
                    setSearchTerm(user.name); // Pre-fill search with user's name
                }
            } else {
                setSearchTerm('');
                setSelectedUser(null);
                setBanReason('');
                setBanDuration('permanent');
            }
        }
    }, [isOpen, preselectedUserId, contacts]);


    if (!isOpen) return null;

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setBanReason(user.banned?.reason || '');
        setBanDuration(user.banned?.bannedUntil ? user.banned.bannedUntil.split('T')[0] : 'permanent');
    };

    const handleBan = () => {
        if (!selectedUser) {
            setModalMessage("Lütfen yasaklamak için bir kullanıcı seçin.");
            setShowModal(true);
            return;
        }
        if (!banReason.trim()) {
            setModalMessage("Lütfen yasaklama sebebini girin.");
            setShowModal(true);
            return;
        }

        const bannedUntil = banDuration === 'permanent' ? null : banDuration;
        onBanUser(selectedUser.id, banReason.trim(), bannedUntil);
        onClose();
    };

    const handleUnban = () => {
        if (!selectedUser) {
            setModalMessage("Lütfen yasağını kaldırmak için bir kullanıcı seçin.");
            setShowModal(true);
            return;
        }
        onUnbanUser(selectedUser.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none p-2"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center">Kullanıcı Yasakla / Yasağı Kaldır</h2>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Kullanıcı adı veya ID ile ara..."
                        className="w-full p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="max-h-40 overflow-y-auto custom-scrollbar mb-4 border border-gray-700 rounded-md">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`flex items-center p-2 cursor-pointer hover:bg-gray-700 ${selectedUser?.id === user.id ? 'bg-blue-700' : ''}`}
                                onClick={() => handleSelectUser(user)}
                            >
                                <img src={user.avatar} className="w-10 h-10 rounded-full mr-3" alt="User Avatar" />
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-gray-400 break-all">ID: {user.id}</p>
                                    {user.banned?.isBanned && (
                                        <p className="text-xs text-red-400">Yasaklı: {user.banned.reason} {user.banned.bannedUntil ? ` (${new Date(user.banned.bannedUntil).toLocaleDateString('tr-TR')}'e kadar)` : ' (Kalıcı)'}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center p-4">Kullanıcı bulunamadı.</p>
                    )}
                </div>

                {selectedUser && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-md">
                        <h3 className="text-lg font-bold mb-2">Seçilen Kullanıcı: {selectedUser.name}</h3>
                        <div className="mb-3">
                            <label className="block text-gray-300 text-sm font-bold mb-1">Yasaklama Sebebi:</label>
                            <textarea
                                className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                rows="3"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Yasaklama sebebini girin..."
                            ></textarea>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-1">Yasaklama Süresi:</label>
                            <select
                                className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={banDuration}
                                onChange={(e) => setBanDuration(e.target.value)}
                            >
                                <option value="permanent">Kalıcı</option>
                                <option value="7days">7 Gün</option>
                                <option value="30days">30 Gün</option>
                                <option value="custom">Özel Tarih</option>
                            </select>
                            {banDuration === 'custom' && (
                                <input
                                    type="date"
                                    className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2"
                                    onChange={(e) => setBanDuration(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={handleBan}
                                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                disabled={selectedUser.banned?.isBanned}
                            >
                                Yasakla
                            </button>
                            <button
                                onClick={handleUnban}
                                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                disabled={!selectedUser.banned?.isBanned}
                            >
                                Yasağı Kaldır
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Admin Warning Modal
const AdminWarningModal = ({ isOpen, onClose, db, appId, setModalMessage, setShowModal, contacts, onWarnUser, preselectedUserId = null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [warningReason, setWarningReason] = useState('');

    const filteredUsers = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || contact.id.includes(searchTerm)
    );

    useEffect(() => {
        if (isOpen) {
            if (preselectedUserId) {
                const user = contacts.find(c => c.id === preselectedUserId);
                if (user) {
                    handleSelectUser(user);
                    setSearchTerm(user.name); // Pre-fill search with user's name
                }
            } else {
                setSearchTerm('');
                setSelectedUser(null);
                setWarningReason('');
            }
        }
    }, [isOpen, preselectedUserId, contacts]);

    if (!isOpen) return null;

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setWarningReason(user.warned?.reason || '');
    };

    const handleWarn = () => {
        if (!selectedUser) {
            setModalMessage("Lütfen uyarmak için bir kullanıcı seçin.");
            setShowModal(true);
            return;
        }
        if (!warningReason.trim()) {
            setModalMessage("Lütfen uyarı sebebini girin.");
            setShowModal(true);
            return;
        }

        onWarnUser(selectedUser.id, warningReason.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md w-full relative rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white focus:outline-none p-2"
                    onClick={onClose}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-center">Kullanıcı Uyar</h2>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Kullanıcı adı veya ID ile ara..."
                        className="w-full p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="max-h-40 overflow-y-auto custom-scrollbar mb-4 border border-gray-700 rounded-md">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`flex items-center p-2 cursor-pointer hover:bg-gray-700 ${selectedUser?.id === user.id ? 'bg-blue-700' : ''}`}
                                onClick={() => handleSelectUser(user)}
                            >
                                <img src={user.avatar} className="w-10 h-10 rounded-full mr-3" alt="User Avatar" />
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-gray-400 break-all">ID: {user.id}</p>
                                    {user.warned?.isWarned && (
                                        <p className="text-xs text-orange-400">Uyarılmış: {user.warned.reason}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center p-4">Kullanıcı bulunamadı.</p>
                    )}
                </div>

                {selectedUser && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-md">
                        <h3 className="text-lg font-bold mb-2">Seçilen Kullanıcı: {selectedUser.name}</h3>
                        <div className="mb-3">
                            <label className="block text-gray-300 text-sm font-bold mb-1">Uyarı Sebebi:</label>
                            <textarea
                                className="w-full p-2 rounded-md bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                rows="3"
                                value={warningReason}
                                onChange={(e) => setWarningReason(e.target.value)}
                                placeholder="Uyarı sebebini girin..."
                            ></textarea>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={handleWarn}
                                className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                disabled={selectedUser.warned?.isWarned}
                            >
                                Uyar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// Ban Screen for banned users
const BanScreen = ({ banInfo }) => {
    const bannedUntilDate = banInfo.bannedUntil ? new Date(banInfo.bannedUntil).toLocaleDateString('tr-TR') : 'Süresiz';
    const bannedUntilTime = banInfo.bannedUntil ? new Date(banInfo.bannedUntil).toLocaleTimeString('tr-TR') : '';

    return (
        <div className="fixed inset-0 bg-red-900 bg-opacity-90 flex flex-col items-center justify-center text-white text-center p-4 z-50">
            <h1 className="text-5xl font-bold mb-6">Yasaklandınız!</h1>
            <p className="text-xl mb-4">Uygulamadan yasaklandınız.</p>
            {banInfo.reason && (
                <p className="text-lg mb-2">Sebep: <span className="font-semibold">{banInfo.reason}</span></p>
            )}
            {banInfo.bannedUntil ? (
                <p className="text-lg mb-6">Yasaklama Süresi: <span className="font-semibold">{bannedUntilDate} {bannedUntilTime}'e kadar</span></p>
            ) : (
                <p className="text-lg mb-6">Yasaklama Süresi: <span className="font-semibold">Kalıcı</span></p>
            )}
            <p className="text-md text-gray-300">Daha fazla bilgi için lütfen yöneticinizle iletişime geçin.</p>
        </div>
    );
};

// Warning Screen for warned users
const WarningScreen = ({ warningInfo, onDismissWarning }) => {
    return (
        <div className="fixed inset-0 bg-orange-900 bg-opacity-90 flex flex-col items-center justify-center text-white text-center p-4 z-50">
            <h1 className="text-5xl font-bold mb-6">Uyarı Aldınız!</h1>
            <p className="text-xl mb-4">Kurallara uymadığınız için bir uyarı aldınız.</p>
            {warningInfo.reason && (
                <p className="text-lg mb-2">Sebep: <span className="font-semibold">{warningInfo.reason}</span></p>
            )}
            <p className="text-lg mb-6">Lütfen kurallara uyun. Tekrarı halinde yasaklanabilirsiniz!</p>
            <button
                onClick={onDismissWarning}
                className="bg-blue-600 text-white py-3 px-8 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
            >
                Tamam
            </button>
        </div>
    );
};


// Forbidden words list
const FORBIDDEN_WORDS = ['küfür', 'hakaret', 'aptal', 'salak', 'gerizekalı', 'lan', 'amk'];

const containsForbiddenWords = (text) => {
    const lowerText = text.toLowerCase();
    return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
};

// Device Mode Selection Modal
const DeviceModeSelectionModal = ({ isOpen, onClose, onSelectMode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-white max-w-sm w-full relative rounded-xl">
                <h2 className="text-3xl font-bold text-center mb-6">Cihaz Modu Seçimi</h2>
                <p className="text-gray-300 mb-8">Uygulamayı hangi modda kullanmak istersiniz?</p>
                <div className="flex flex-col space-y-4">
                    <button
                        onClick={() => onSelectMode('desktop')}
                        className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
                    >
                        Masaüstü Modu
                    </button>
                    <button
                        onClick={() => onSelectMode('phone')}
                        className="w-full bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                    >
                        Telefon Modu
                    </button>
                </div>
            </div>
        </div>
    );
};


// Ana uygulama bileşeni
const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showWelcomeModal, setShowWelcomeModal] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const [groups, setGroups] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [showContactProfileModal, setShowContactProfileModal] = useState(false);
    const [selectedContactForProfile, setSelectedContactForProfile] = useState(null);
    const [showCallIncomingModal, setShowCallIncomingModal] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const messagesEndRef = useRef(null);
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
    const [existingGroupNames, setExistingGroupNames] = useState([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [isRecording, setIsRecording] = useState(false);
    const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState({});
    const [myComments, setMyComments] = useState([]);
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [showManageGroupMembersModal, setShowManageGroupMembersModal] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false); // New state for settings panel
    const [showAdminBanModal, setShowAdminBanModal] = useState(false); // New state for admin ban modal
    const [showAdminWarningModal, setShowAdminWarningModal] = useState(false); // New state for admin warning modal
    const [preselectedBanOrWarnUserId, setPreselectedBanOrWarnUserId] = useState(null); // To pre-fill ban/warn modal

    const [selectedDeviceMode, setSelectedDeviceMode] = useState(null); // 'desktop' | 'phone' | null
    const [showDeviceModeSelectionModal, setShowDeviceModeSelectionModal] = useState(true);
    const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(false); // For mobile UI toggle

    const [searchTerm, setSearchTerm] = useState(''); // New state for search term
    const [adminReports, setAdminReports] = useState([]); // New state for admin reports

    const ADMIN_ID = "10686508902561997070"; // Hardcoded admin ID

    // Cihaz türü tespiti (responsive için hala gerekli)
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 768); // Tailwind'in 'md' breakpoint'ini kullanıyoruz
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Firebase'i başlat ve kimlik doğrulamayı yönet
    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    const userDocRef = doc(firestore, `artifacts/${appId}/public/data/users`, user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setCurrentUser(userData);
                        // Update status to online
                        await updateDoc(userDocRef, { status: 'Çevrimiçi' });

                        // Load device mode from user profile
                        if (userData.deviceMode) {
                            setSelectedDeviceMode(userData.deviceMode);
                            setShowDeviceModeSelectionModal(false); // If mode exists, don't show modal
                        } else {
                            setShowDeviceModeSelectionModal(true); // If no mode, show modal
                        }
                        // Check if welcome modal should be shown
                        if (userData.hasSeenWelcome) {
                            setShowWelcomeModal(false);
                        } else {
                            // Only show welcome modal if device mode is already selected or will be selected
                            if (userData.deviceMode || !showDeviceModeSelectionModal) {
                                setShowWelcomeModal(true);
                            } else {
                                setShowWelcomeModal(false); // Wait for device mode selection
                            }
                        }

                    } else {
                        // New user, set default profile and show device mode selection
                        const newUserProfile = {
                            id: user.uid,
                            name: user.uid === ADMIN_ID ? 'ADMİN' : (user.isAnonymous ? `Misafir ${user.uid.substring(0, 6)}` : (user.email?.split('@')[0] || `Kullanıcı ${user.uid.substring(0,6)}`)),
                            avatar: user.uid === ADMIN_ID ? 'https://placehold.co/150x150/0000FF/FFFFFF?text=ADMIN' : 'https://placehold.co/150x150/7f8c8d/ffffff?text=?',
                            status: 'Çevrimiçi',
                            createdAt: serverTimestamp(),
                            email: user.email || null,
                            isEmailVerified: user.emailVerified || false,
                            friends: [],
                            ratings: [],
                            ratedBy: [],
                            averageRating: 0,
                            deviceMode: null, // Will be set by DeviceModeSelectionModal
                            hasSeenWelcome: false, // Will be set by WelcomeModal
                            lastBackupTime: null, // New: For chat backup simulation
                            callHistory: [], // New: For call history
                            banned: { isBanned: false, reason: null, bannedUntil: null, bannedBy: null }, // New: Ban status
                            warned: { isWarned: false, reason: null, warnedBy: null, warnedAt: null } // New: Warning status
                        };
                        await setDoc(userDocRef, newUserProfile);
                        setCurrentUser(newUserProfile);
                        setShowDeviceModeSelectionModal(true); // Always show for new users
                        setShowWelcomeModal(false); // Welcome modal will be shown after device mode selection
                    }
                    setIsAuthReady(true);
                    setShowAuthModal(false);
                } else {
                    // Update status to offline/last seen for the user who just signed out
                    if (currentUser && db) {
                        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.id);
                        await updateDoc(userDocRef, {
                            status: `Son Görülme: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                        });
                    }
                    setUserId(null);
                    setCurrentUser(null);
                    setIsAuthReady(true);
                    setSelectedDeviceMode(null); // Reset device mode on sign out
                    setShowWelcomeModal(false); // Ensure welcome modal is not shown immediately
                    setShowAuthModal(false); // Auth modal will be shown after device mode selection if needed
                    setShowDeviceModeSelectionModal(true); // Show device mode selection for new session
                }
                setLoading(false);
            });
            
            // Özel token veya anonim olarak ilk kimlik doğrulamasını ele al
            const initialAuth = async () => {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    try {
                        await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                    } catch (error) {
                        console.error("Özel token ile giriş başarısız, anonim olarak deneniyor:", error);
                        await signInAnonymously(firebaseAuth);
                    }
                } else {
                    if (!firebaseAuth.currentUser) {
                        try {
                            await signInAnonymously(firebaseAuth);
                        } catch (error) {
                            console.error("Anonim giriş başarısız:", error);
                        }
                    }
                }
            };
            initialAuth();

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
    }, [currentUser, db]); // currentUser ve db ekledim ki signOut durumunda status güncellenebilsin

    // Firestore listeners
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const unsubscribers = [];
        
        // Users listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/users`)), (snapshot) => {
            console.log("Listening to users. User ID:", userId, "Path:", `artifacts/${appId}/public/data/users`); // Debug log
            const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContacts(fetchedUsers.filter(user => user.id !== userId));
        }, (error) => {
            console.error("Kullanıcıları dinlerken hata oluştu:", error);
        }));

        // Groups listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/groups`)), (snapshot) => {
            console.log("Listening to groups. User ID:", userId, "Path:", `artifacts/${appId}/public/data/groups`); // Debug log
            const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter groups to only show those the current user is a member of
            const userGroups = fetchedGroups.filter(group => group.members && group.members.includes(userId));
            setGroups(userGroups);
            setExistingGroupNames(fetchedGroups.map(group => group.name.toLowerCase()));
        }, (error) => {
            console.error("Grupları dinlerken hata oluştu:", error);
        }));

        // Calls listener
        const callsQuery = query(collection(db, `artifacts/${appId}/public/data/calls`));
        unsubscribers.push(onSnapshot(callsQuery, async (snapshot) => {
            console.log("Listening to calls. User ID:", userId, "Path:", `artifacts/${appId}/public/data/calls`); // Debug log
             for (const change of snapshot.docChanges()) {
                const callData = change.doc.data();
                const callId = change.doc.id;
                if (callData.calleeId === userId && callData.status === 'pending' && change.type === 'added') {
                    const callerDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/users`, callData.callerId));
                    const callerName = callerDoc.exists() ? callerDoc.data().name : 'Bilinmeyen Kullanıcı';
                    setIncomingCallData({ ...callData, callerName, callId });
                    setShowCallIncomingModal(true);
                }
            }
        }, (error) => {
            console.error("Çağrıları dinlerken hata oluştu:", error);
        }));
        
        if (!selectedChat) {
            setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' });
        }

        return () => unsubscribers.forEach(unsub => unsub());
    }, [db, isAuthReady, userId]);
    
    // Message listener and Unread Count
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !selectedChat) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        let q;
        let path;
        
        // Reset unread count for the currently selected chat
        setUnreadMessagesCount(prevCounts => ({
            ...prevCounts,
            [selectedChat.id]: 0
        }));

        if (selectedChat.type === 'public') {
            path = `artifacts/${appId}/public/data/messages`;
            q = query(collection(db, path), orderBy('timestamp'));
        } else if (selectedChat.type === 'group') {
            const currentGroup = groups.find(g => g.id === selectedChat.id);
            if (!currentGroup || !currentGroup.members.includes(userId)) {
                setMessages([]);
                setModalMessage("Bu gruba katılmak için davet edilmiş olmanız gerekmektedir.");
                setShowModal(true);
                setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' }); // Switch to public chat
                return;
            }
            path = `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`;
            q = query(collection(db, path), orderBy('timestamp'));
        } else if (selectedChat.type === 'private') {
            path = `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`;
            q = query(collection(db, path), orderBy('timestamp'));
        } else {
            setMessages([]);
            return;
        }
        console.log("Listening to messages. User ID:", userId, "Path:", path); // Debug log

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure data exists before processing
                if (!data) return null; 
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) || 'Şimdi'
                };
            }).filter(msg => msg !== null); // Filter out any null messages

            // Update unread counts
            setUnreadMessagesCount(prevCounts => {
                const newCounts = { ...prevCounts };
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const msg = change.doc.data();
                        // Only count messages that are not from the current user and not in the currently selected chat
                        if (msg.senderId !== userId && msg.chatTargetId !== selectedChat.id) {
                            const targetChatId = msg.chatTargetId; // This should be the group ID or private chat ID
                            newCounts[targetChatId] = (newCounts[targetChatId] || 0) + 1;
                        }
                    }
                });
                return newCounts;
            });
            setMessages(fetchedMessages);
        }, (error) => {
            console.error("Mesajları dinlerken hata oluştu:", error);
        });

        return () => unsubscribe();
    }, [db, isAuthReady, userId, selectedChat, groups]); // groups'u dependency olarak ekledim

    // Listener for comments on current user's profile
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const commentsOnMyProfileQuery = query(
            collection(db, `artifacts/${appId}/public/data/users`, userId, 'comments'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribeComments = onSnapshot(commentsOnMyProfileQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleString('tr-TR') || 'Şimdi'
            }));
            setMyComments(fetchedComments);
        }, (error) => {
            console.error("Kendi profilimdeki yorumları dinlerken hata oluştu:", error);
        });

        return () => unsubscribeComments();
    }, [db, isAuthReady, userId]);

    // Listener for admin reports (only for ADMIN_ID)
    useEffect(() => {
        if (!db || !isAuthReady || userId !== ADMIN_ID) {
            setAdminReports([]);
            return;
        }
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const reportsQuery = query(
            collection(db, `artifacts/${appId}/public/data/reports`),
            orderBy('timestamp', 'desc')
        );

        const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
            const fetchedReports = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString() // Ensure consistent date format
            }));
            setAdminReports(fetchedReports);
        }, (error) => {
            console.error("Yönetici şikayetlerini dinlerken hata oluştu:", error);
        });

        return () => unsubscribeReports();
    }, [db, isAuthReady, userId, ADMIN_ID]);


    const handleGuestLogin = async () => {
        if (auth) {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                setModalMessage("Misafir olarak giriş yapılırken bir hata oluştu.");
                setShowModal(true);
            }
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (messageData) => {
        if (!db || !userId || !selectedChat) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        // Check group membership before sending message to a group
        if (selectedChat.type === 'group') {
            const currentGroup = groups.find(g => g.id === selectedChat.id);
            if (!currentGroup || !currentGroup.members.includes(userId)) {
                setModalMessage("Bu gruba mesaj göndermek için üye olmanız gerekmektedir.");
                setShowModal(true);
                return;
            }
            // Check if banned from group
            if (currentGroup.bannedMembers && currentGroup.bannedMembers.includes(userId)) {
                setModalMessage("Bu gruptan yasaklandınız ve mesaj gönderemezsiniz.");
                setShowModal(true);
                return;
            }
        }

        // Check for forbidden words in text messages
        if (messageData.type === 'text' && containsForbiddenWords(messageData.text)) {
            setModalMessage("Mesajınız yasaklı kelimeler içeriyor ve gönderilemez. Kurallara uyun!");
            setShowModal(true);
            // Simulate sending message to admin if the sender is the admin and breaks rules
            // This is a client-side simulation, real moderation needs backend.
            if (selectedChat.type === 'group' && selectedChat.adminIds && selectedChat.adminIds.includes(userId)) {
                console.warn("Yönetici yasaklı kelime kullandı. Bu mesaj normalde yöneticiye bildirilecektir.");
                // In a real app, you'd send a notification to a specific admin channel/user.
            }
            return;
        }


        const fullMessageData = {
            ...messageData,
            senderId: userId,
            senderName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
            timestamp: serverTimestamp(),
            chatType: selectedChat.type,
            chatTargetId: selectedChat.id
        };

        try {
            let collectionPath;
            if (selectedChat.type === 'public') {
                collectionPath = `artifacts/${appId}/public/data/messages`;
            } else if (selectedChat.type === 'group') {
                collectionPath = `artifacts/${appId}/public/data/group_messages/${selectedChat.id}/messages`;
            } else if (selectedChat.type === 'private') {
                collectionPath = `artifacts/${appId}/public/data/private_messages/${selectedChat.id}/messages`;
            }
            
            const messagesCollectionRef = collection(db, collectionPath);
            const newDocRef = doc(messagesCollectionRef); // Benzersiz bir kimliğe sahip yeni bir belge referansı oluştur
            await setDoc(newDocRef, fullMessageData); // Belgeyi oluşturulan kimlikle ayarla

            if (messageData.type === 'text') {
                setNewMessage('');
            }
        } catch (e) {
            console.error("Mesaj gönderilirken hata oluştu: ", e);
            setModalMessage("Mesaj gönderilirken bir hata oluştu.");
            setShowModal(true);
        }
    };

    const handleTextSend = () => {
        if (newMessage.trim() !== '') {
            sendMessage({ type: 'text', text: newMessage.trim() });
        }
    };
    
    const handleProfileUpdate = async (newName, newAvatar) => {
        if (!db || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        try {
            await updateDoc(userDocRef, { name: newName, avatar: newAvatar });
            setCurrentUser(prev => ({ ...prev, name: newName, avatar: newAvatar }));
            setModalMessage("Profiliniz güncellendi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Profil güncellenirken bir hata oluştu.");
            setShowModal(true);
        }
    };

    const handleUpdateUserSettings = async (updates) => {
        if (!db || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        try {
            await updateDoc(userDocRef, updates);
            setCurrentUser(prev => ({ ...prev, ...updates }));
            setModalMessage("Ayarlar güncellendi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Ayarlar güncellenirken bir hata oluştu.");
            setShowModal(true);
            console.error("Ayarlar güncellenirken hata:", e);
        }
    };
    
    const createNewGroup = async (groupName) => {
        if (groupName && db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            
            // Check for unique group name
            const groupsRef = collection(db, `artifacts/${appId}/public/data/groups`);
            const q = query(groupsRef, where('name', '==', groupName));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setModalMessage("Bu grup adı zaten kullanılıyor. Lütfen farklı bir isim seçin.");
                setShowModal(true);
                return;
            }

            // Check for forbidden words in group name
            if (containsForbiddenWords(groupName.trim())) {
                setModalMessage("Grup adı yasaklı kelimeler içeriyor. Lütfen farklı bir isim seçin.");
                setShowModal(true);
                return;
            }

            try {
                const newGroupRef = await addDoc(collection(db, `artifacts/${appId}/public/data/groups`), {
                    name: groupName,
                    members: [userId], // Creator is the first member
                    adminIds: [userId], // Set creator as admin
                    bannedMembers: [], // New: Array to store banned user IDs
                    createdAt: serverTimestamp()
                });
                setSelectedChat({ id: newGroupRef.id, name: groupName, type: 'group' });
                setModalMessage(`'${groupName}' grubu başarıyla oluşturuldu!`);
                setShowModal(true);
            } catch (e) {
                setModalMessage("Grup oluşturulurken bir hata oluştu.");
                setShowModal(true);
            }
        }
    };

    const handleRateUser = async (targetUserId, rating) => {
        if (!db || !userId || rating === 0) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, targetUserId);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) {
                    throw "Kullanıcı bulunamadı!";
                }

                const userData = userDoc.data();
                const ratedBy = userData.ratedBy || [];

                if (ratedBy.includes(userId)) {
                    setModalMessage("Bu kullanıcıyı zaten puanladınız.");
                    setShowModal(true);
                    return; // Exit transaction if already rated
                }

                const ratings = userData.ratings || [];
                ratings.push(rating);
                ratedBy.push(userId);
                const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

                transaction.update(userDocRef, {
                    ratings: ratings,
                    ratedBy: ratedBy,
                    averageRating: averageRating
                });
            });
            setModalMessage("Puanınız başarıyla kaydedildi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage(`Puan verilirken bir hata oluştu: ${e}`);
            setShowModal(true);
        }
    };

    const handleCommentSubmit = async (targetUserId, commentText) => {
        if (!db || !userId || !commentText.trim()) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // Check for forbidden words in comments
        if (containsForbiddenWords(commentText.trim())) {
            setModalMessage("Yorumunuz yasaklı kelimeler içeriyor ve gönderilemez.");
            setShowModal(true);
            return;
        }

        try {
            // addDoc yerine doc(collectionRef) ve setDoc kullanıldı
            const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/users`, targetUserId, 'comments');
            const newCommentDocRef = doc(commentsCollectionRef);
            await setDoc(newCommentDocRef, {
                commenterId: userId,
                commenterName: currentUser?.name || `Kullanıcı ${userId.substring(0, 6)}`,
                text: commentText.trim(),
                timestamp: serverTimestamp(),
            });
            setModalMessage("Yorumunuz başarıyla eklendi!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Yorum eklenirken bir hata oluştu.");
            setShowModal(true);
            console.error("Yorum eklenirken hata:", e);
        }
    };

    const handleReportUser = async (reportedUserId, reason) => {
        if (!db || !userId || !reportedUserId || !reason.trim()) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // Check for forbidden words in report reason
        if (containsForbiddenWords(reason.trim())) {
            setModalMessage("Şikayet sebebiniz yasaklı kelimeler içeriyor ve gönderilemez.");
            setShowModal(true);
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/reports`), {
                reporterId: userId,
                reportedUserId: reportedUserId,
                reason: reason.trim(),
                timestamp: serverTimestamp(),
                status: 'pending' // 'pending' or 'reviewed'
            });
            setModalMessage("Şikayetiniz başarıyla gönderildi. Yöneticilerimiz en kısa sürede inceleyecektir.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Şikayet gönderilirken bir hata oluştu.");
            setShowModal(true);
            console.error("Şikayet gönderilirken hata:", e);
        }
    };

    const handleUpdateReportStatus = async (reportId, status) => {
        if (!db || userId !== ADMIN_ID || !reportId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const reportDocRef = doc(db, `artifacts/${appId}/public/data/reports`, reportId);

        try {
            await updateDoc(reportDocRef, { status: status });
            setModalMessage("Şikayet durumu güncellendi.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Şikayet durumu güncellenirken bir hata oluştu.");
            setShowModal(true);
            console.error("Şikayet durumu güncellenirken hata:", e);
        }
    };


    const handleFileDownload = (fileMessage) => {
        setModalMessage(`'${fileMessage.fileName}' indiriliyor... (Simülasyon)`);
        setShowModal(true);
    };

    const copyUserIdToClipboard = () => {
        if (userId) {
            navigator.clipboard.writeText(userId).then(() => {
                setModalMessage("Kullanıcı ID'si panoya kopyalandı!");
                setShowModal(true);
            });
        }
    };

    const addFriend = async (friendIdToAdd) => {
        if (friendIdToAdd && friendIdToAdd.trim() !== '' && db && userId && currentUser) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const friendDocRef = doc(db, `artifacts/${appId}/public/data/users`, friendIdToAdd);
            const friendDocSnap = await getDoc(friendDocRef);
            if (!friendDocSnap.exists()) {
                setModalMessage("Kullanıcı bulunamadı.");
                setShowModal(true);
                return;
            }
            if (currentUser.friends?.includes(friendIdToAdd) || friendIdToAdd === userId) {
                setModalMessage(friendIdToAdd === userId ? "Kendinizi ekleyemezsiniz." : "Bu kullanıcı zaten arkadaşınız.");
                setShowModal(true);
                return;
            }
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
            await updateDoc(userDocRef, { friends: arrayUnion(friendIdToAdd) });
            setModalMessage(`'${friendDocSnap.data().name}' arkadaş olarak eklendi!`);
            setShowModal(true);
        }
    };

    const startPrivateChat = (friendId, friendName) => {
        if (!userId) return;
        const privateChatId = [userId, friendId].sort().join('_');
        setSelectedChat({ id: privateChatId, name: friendName, type: 'private', targetId: friendId });
        if (isSmallScreen && selectedDeviceMode === 'phone') {
            setShowSidebarOnMobile(false); // Hide sidebar after selecting chat on mobile
        }
    };
    
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file && selectedChat) {
            const reader = new FileReader();
            reader.onloadend = () => {
                sendMessage({
                    type: 'file',
                    text: `Dosya: ${file.name}`,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    fileUrl: reader.result // Store the Data URL
                });
                setModalMessage(`'${file.name}' dosyası gönderildi.`);
                setShowModal(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = null;
    };

    const handleAcceptCall = async () => {
        if (incomingCallData && db && userId && currentUser) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, incomingCallData.callId);
            await updateDoc(callDocRef, { status: 'accepted' });

            // Add to call history for current user
            const updatedCallHistory = arrayUnion({
                type: incomingCallData.type,
                partnerId: incomingCallData.callerId,
                partnerName: incomingCallData.callerName,
                status: 'Kabul Edildi',
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, `artifacts/${appId}/public/data/users`, userId), { callHistory: updatedCallHistory });
            setCurrentUser(prev => ({ ...prev, callHistory: [...(prev.callHistory || []), { type: incomingCallData.type, partnerId: incomingCallData.callerId, partnerName: incomingCallData.callerName, status: 'Kabul Edildi', timestamp: new Date().toISOString() }] }));

            setShowCallIncomingModal(false);
            setModalMessage(`${incomingCallData.callerName} ile ${incomingCallData.type === 'video' ? 'görüntülü' : 'sesli'} arama başladı.`);
            setShowModal(true);
        }
    };

    const handleRejectCall = async () => {
        if (incomingCallData && db && userId && currentUser) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const callDocRef = doc(db, `artifacts/${appId}/public/data/calls`, incomingCallData.callId);
            await updateDoc(callDocRef, { status: 'rejected' });

            // Add to call history for current user
            const updatedCallHistory = arrayUnion({
                type: incomingCallData.type,
                partnerId: incomingCallData.callerId,
                partnerName: incomingCallData.callerName,
                status: 'Reddedildi',
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, `artifacts/${appId}/public/data/users`, userId), { callHistory: updatedCallHistory });
            setCurrentUser(prev => ({ ...prev, callHistory: [...(prev.callHistory || []), { type: incomingCallData.type, partnerId: incomingCallData.callerId, partnerName: incomingCallData.callerName, status: 'Reddedildi', timestamp: new Date().toISOString() }] }));

            setShowCallIncomingModal(false);
            setModalMessage(`${incomingCallData.callerName} ile ${incomingCallData.type === 'video' ? 'görüntülü' : 'sesli'} arama reddedildi.`);
            setShowModal(true);
        }
    };

    const startCall = async (calleeId, callType) => {
        if (!db || !userId || !currentUser) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const calleeUser = contacts.find(c => c.id === calleeId);
        if (!calleeUser) {
            setModalMessage("Aranacak kullanıcı bulunamadı.");
            setShowModal(true);
            return;
        }

        try {
            const newCallRef = await addDoc(collection(db, `artifacts/${appId}/public/data/calls`), {
                callerId: userId,
                calleeId: calleeId,
                type: callType, // 'video' or 'audio'
                status: 'pending',
                timestamp: serverTimestamp()
            });

            // Add to call history for current user (caller)
            const updatedCallHistory = arrayUnion({
                type: callType,
                partnerId: calleeId,
                partnerName: calleeUser.name,
                status: 'Arandı',
                timestamp: new Date().toISOString()
            });
            await updateDoc(doc(db, `artifacts/${appId}/public/data/users`, userId), { callHistory: updatedCallHistory });
            setCurrentUser(prev => ({ ...prev, callHistory: [...(prev.callHistory || []), { type: callType, partnerId: calleeId, partnerName: calleeUser.name, status: 'Arandı', timestamp: new Date().toISOString() }] }));

            setModalMessage(`${calleeUser.name} aranıyor...`);
            setShowModal(true);
            setShowContactProfileModal(false); // Close profile modal
        } catch (e) {
            setModalMessage("Arama başlatılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Arama başlatılırken hata:", e);
        }
    };

    const inviteUserToGroup = async (groupId, invitedUserId) => {
        if (!db || !userId || !groupId || !invitedUserId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);
        
        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }

        try {
            await updateDoc(groupDocRef, {
                members: arrayUnion(invitedUserId)
            });
            setModalMessage("Kullanıcı gruba davet edildi!");
            setShowModal(true);
            setShowInviteMemberModal(false); // Close modal after inviting
        } catch (e) {
            setModalMessage("Kullanıcı davet edilirken bir hata oluştu.");
            setShowModal(true);
            console.error("Kullanıcı davet edilirken hata:", e);
        }
    };

    const handleLeaveGroup = async (groupId) => {
        if (!db || !userId || !groupId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup) return;

        const confirmLeave = window.confirm("Bu gruptan ayrılmak istediğinizden emin misiniz?");
        if (!confirmLeave) return;

        try {
            // If the user is the only admin, prevent leaving unless they transfer admin role or delete group
            if (currentGroup.adminIds && currentGroup.adminIds.includes(userId) && currentGroup.adminIds.length === 1 && currentGroup.members.length > 1) {
                setModalMessage("Gruptaki tek yönetici sizsiniz. Ayrılmadan önce yöneticiliği başka birine devretmeli veya grubu silmelisiniz.");
                setShowModal(true);
                return;
            }

            // Remove user from members and adminIds if they are an admin
            await updateDoc(groupDocRef, {
                members: arrayRemove(userId),
                adminIds: arrayRemove(userId) // Also remove from adminIds if they were an admin
            });
            setModalMessage("Gruptan başarıyla ayrıldınız.");
            setShowModal(true);
            setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' }); // Switch to public chat
        } catch (e) {
            setModalMessage("Gruptan ayrılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Gruptan ayrılırken hata:", e);
        }
    };


    const handleRemoveMember = async (groupId, memberIdToRemove) => {
        if (!db || !userId || !groupId || !memberIdToRemove) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (memberIdToRemove === userId) {
            setModalMessage("Kendinizi gruptan çıkaramazsiniz.");
            setShowModal(true);
            return;
        }
        if (currentGroup.adminIds && currentGroup.adminIds.includes(memberIdToRemove)) {
             setModalMessage("Bir yöneticiyi doğrudan çıkaramazsınız. Önce yöneticilikten almalısınız.");
             setShowModal(true);
             return;
        }

        const confirmRemove = window.confirm("Bu üyeyi gruptan çıkarmak istediğinizden emin misiniz?");
        if (!confirmRemove) return;

        try {
            await updateDoc(groupDocRef, {
                members: arrayRemove(memberIdToRemove)
            });
            setModalMessage("Üye gruptan çıkarıldı.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Üye çıkarılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Üye çıkarılırken hata:", e);
        }
    };

    const handleBanMember = async (groupId, memberIdToBan) => {
        if (!db || !userId || !groupId || !memberIdToBan) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (memberIdToBan === userId) {
            setModalMessage("Kendinizi yasaklayamazsınız.");
            setShowModal(true);
            return;
        }
        if (currentGroup.adminIds && currentGroup.adminIds.includes(memberIdToBan)) {
            setModalMessage("Bir yöneticiyi yasaklayamazsınız. Önce yöneticilikten almalısınız.");
            setShowModal(true);
            return;
        }
        if (currentGroup.bannedMembers && currentGroup.bannedMembers.includes(memberIdToBan)) {
            setModalMessage("Bu üye zaten yasaklı.");
            setShowModal(true);
            return;
        }

        const confirmBan = window.confirm("Bu üyeyi gruptan yasaklamak istediğinizden emin misiniz? (Sonsuz ban)");
        if (!confirmBan) return;

        try {
            await updateDoc(groupDocRef, {
                members: arrayRemove(memberIdToBan), // Remove from members
                bannedMembers: arrayUnion(memberIdToBan) // Add to banned
            });
            setModalMessage("Üye başarıyla yasaklandı.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Üye yasaklanırken bir hata oluştu.");
            setShowModal(true);
            console.error("Üye yasaklanırken hata:", e);
        }
    };

    const handleUnbanMember = async (groupId, memberIdToUnban) => {
        if (!db || !userId || !groupId || !memberIdToUnban) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (!currentGroup.bannedMembers || !currentGroup.bannedMembers.includes(memberIdToUnban)) {
            setModalMessage("Bu üye yasaklı değil.");
            setShowModal(true);
            return;
        }

        const confirmUnban = window.confirm("Bu üyenin yasağını kaldırmak istediğinizden emin misiniz?");
        if (!confirmUnban) return;

        try {
            await updateDoc(groupDocRef, {
                members: arrayUnion(memberIdToUnban), // Add back to members
                bannedMembers: arrayRemove(memberIdToUnban) // Remove from banned
            });
            setModalMessage("Üyenin yasağı kaldırıldı.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Üyenin yasağı kaldırılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Üyenin yasağı kaldırılırken hata:", e);
        }
    };

    const handlePromoteAdmin = async (groupId, memberIdToPromote) => {
        if (!db || !userId || !groupId || !memberIdToPromote) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (currentGroup.adminIds && currentGroup.adminIds.includes(memberIdToPromote)) {
            setModalMessage("Bu üye zaten yönetici.");
            setShowModal(true);
            return;
        }
        if (currentGroup.adminIds && currentGroup.adminIds.length >= 3) {
            setModalMessage("Bir grupta en fazla 3 yönetici olabilir.");
            setShowModal(true);
            return;
        }

        try {
            await updateDoc(groupDocRef, {
                adminIds: arrayUnion(memberIdToPromote)
            });
            setModalMessage("Üye yönetici yapıldı!");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Üye yönetici yapılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Üye yönetici yapılırken hata:", e);
        }
    };

    const handleDemoteAdmin = async (groupId, memberIdToDemote) => {
        if (!db || !userId || !groupId || !memberIdToDemote) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, groupId);

        const currentGroup = groups.find(g => g.id === groupId);
        if (!currentGroup || !currentGroup.adminIds || !currentGroup.adminIds.includes(userId)) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (!currentGroup.adminIds || !currentGroup.adminIds.includes(memberIdToDemote)) {
            setModalMessage("Bu üye yönetici değil.");
            setShowModal(true);
            return;
        }
        if (memberIdToDemote === userId) {
            setModalMessage("Kendinizi yöneticilikten alamazsınız.");
            setShowModal(true);
            return;
        }
        if (currentGroup.adminIds.length === 1) {
            setModalMessage("Grupta en az bir yönetici bulunmalıdır. Yöneticiyi değiştirmek için önce başka birini yönetici yapın.");
            setShowModal(true);
            return;
        }

        try {
            await updateDoc(groupDocRef, {
                adminIds: arrayRemove(memberIdToDemote)
            });
            setModalMessage("Üye yöneticilikten alındı.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Üye yöneticilikten alınırken bir hata oluştu.");
            setShowModal(true);
            console.error("Üye yöneticilikten alınırken hata:", e);
        }
    };


    // Ses Kayıt Fonksiyonları
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                // Gerçek bir uygulamada bu audioBlob Firebase Storage'a yüklenir.
                // Şimdilik sadece mesaj olarak gönderiyoruz.
                sendMessage({
                    type: 'audio',
                    text: 'Sesli Mesaj',
                    audioUrl: audioUrl, // Data URL veya Storage URL'si
                    fileName: `voice_message_${Date.now()}.webm`,
                    fileType: 'audio/webm',
                    fileSize: audioBlob.size // Boyutunu da ekleyebiliriz
                });
                // Stream'i durdur
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setModalMessage("Ses kaydı başladı...");
            setShowModal(true);
        } catch (err) {
            console.error('Mikrofona erişilemedi:', err);
            setModalMessage("Mikrofona erişim izni verilmedi veya bir hata oluştu.");
            setShowModal(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setModalMessage("Ses kaydı durduruldu ve gönderiliyor...");
            setShowModal(true);
        }
    };

    const deleteMessage = async (messageId, chatType, chatTargetId) => {
        if (!db || !userId || !messageId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        let messageDocRef;
        if (chatType === 'public') {
            messageDocRef = doc(db, `artifacts/${appId}/public/data/messages`, messageId);
        } else if (chatType === 'group') {
            messageDocRef = doc(db, `artifacts/${appId}/public/data/group_messages/${chatTargetId}/messages`, messageId);
        } else if (chatType === 'private') {
            messageDocRef = doc(db, `artifacts/${appId}/public/data/private_messages/${chatTargetId}/messages`, messageId);
        } else {
            return;
        }

        try {
            // Check if the current user is the sender of the message
            const messageSnap = await getDoc(messageDocRef);
            if (messageSnap.exists() && messageSnap.data().senderId === userId) {
                const confirmDelete = window.confirm("Bu mesajı silmek istediğinizden emin misiniz?");
                if (confirmDelete) {
                    await deleteDoc(messageDocRef);
                    setModalMessage("Mesaj başarıyla silindi.");
                }
            } else {
                setModalMessage("Bu mesajı silme izniniz yok.");
            }
            setShowModal(true);
        } catch (e) {
            setModalMessage("Mesaj silinirken bir hata oluştu.");
            setShowModal(true);
            console.error("Mesaj silinirken hata:", e);
        }
    };

    const handleSelectChatFromNotification = (chatId) => {
        // Find the chat details (name, type) based on chatId
        let chatDetails = null;
        if (chatId === 'public') {
            chatDetails = { id: 'public', name: 'Genel Sohbet', type: 'public' };
        } else {
            const group = groups.find(g => g.id === chatId);
            if (group) {
                chatDetails = { id: group.id, name: group.name, type: 'group', adminIds: group.adminIds };
            } else {
                // For private chats, the chatId is a sorted combination of two user IDs.
                // We need to find the other user's ID and name.
                const userIds = chatId.split('_');
                const otherUserId = userIds.find(id => id !== userId);
                const otherUser = contacts.find(c => c.id === otherUserId);
                if (otherUser) {
                    chatDetails = { id: chatId, name: otherUser.name, type: 'private', targetId: otherUserId };
                }
            }
        }

        if (chatDetails) {
            setSelectedChat(chatDetails);
            setUnreadMessagesCount(prevCounts => ({
                ...prevCounts,
                [chatId]: 0 // Reset unread count for this chat
            }));
            setShowRightPanel(false); // Close the right panel after selecting chat
            if (isSmallScreen && selectedDeviceMode === 'phone') {
                setShowSidebarOnMobile(false); // Hide sidebar on mobile after selecting chat from notification
            }
        }
    };

    const handleSelectDeviceMode = async (mode) => {
        if (!db || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        try {
            await updateDoc(userDocRef, { deviceMode: mode });
            setSelectedDeviceMode(mode);
            setCurrentUser(prev => ({ ...prev, deviceMode: mode }));
            setShowDeviceModeSelectionModal(false);
            // After device mode, check if welcome modal should be shown
            if (!currentUser?.hasSeenWelcome) {
                setShowWelcomeModal(true);
            } else {
                setShowAuthModal(false); // Proceed if already authenticated and welcome seen
            }
        } catch (e) {
            setModalMessage("Cihaz modu kaydedilirken bir hata oluştu.");
            setShowModal(true);
            console.error("Cihaz modu kaydedilirken hata:", e);
        }
    };

    const handleWelcomeModalClose = async () => {
        if (!db || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        try {
            await updateDoc(userDocRef, { hasSeenWelcome: true });
            setCurrentUser(prev => ({ ...prev, hasSeenWelcome: true }));
            setShowWelcomeModal(false);
        } catch (e) {
            setModalMessage("Hoş geldiniz mesajı durumu kaydedilirken bir hata oluştu.");
            setShowModal(true);
            console.error("Hoş geldiniz mesajı durumu kaydedilirken hata:", e);
        }
    };

    const handleBanUser = async (targetUserId, reason, bannedUntil) => {
        if (!db || !userId || userId !== ADMIN_ID) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (targetUserId === ADMIN_ID) {
            setModalMessage("Yöneticiyi yasaklayamazsınız.");
            setShowModal(true);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, targetUserId);
        try {
            await updateDoc(userDocRef, {
                banned: {
                    isBanned: true,
                    reason: reason,
                    bannedUntil: bannedUntil,
                    bannedBy: userId,
                    bannedAt: new Date().toISOString()
                },
                // Clear warning if banned
                warned: { isWarned: false, reason: null, warnedBy: null, warnedAt: null }
            });
            setModalMessage(`${contacts.find(c => c.id === targetUserId)?.name || targetUserId} başarıyla yasaklandı.`);
            setShowModal(true);
        } catch (e) {
            setModalMessage("Kullanıcı yasaklanırken bir hata oluştu.");
            setShowModal(true);
            console.error("Kullanıcı yasaklanırken hata:", e);
        }
    };

    const handleUnbanUser = async (targetUserId) => {
        if (!db || !userId || userId !== ADMIN_ID) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, targetUserId);
        try {
            await updateDoc(userDocRef, {
                banned: {
                    isBanned: false,
                    reason: null,
                    bannedUntil: null,
                    bannedBy: null
                }
            });
            setModalMessage(`${contacts.find(c => c.id === targetUserId)?.name || targetUserId} kullanıcısının yasağı kaldırıldı.`);
            setShowModal(true);
        } catch (e) {
            setModalMessage("Kullanıcının yasağı kaldırılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Kullanıcının yasağı kaldırılırken hata:", e);
        }
    };

    const handleWarnUser = async (targetUserId, reason) => {
        if (!db || !userId || userId !== ADMIN_ID) {
            setModalMessage("Bu işlemi yapmaya yetkiniz yok.");
            setShowModal(true);
            return;
        }
        if (targetUserId === ADMIN_ID) {
            setModalMessage("Yöneticiyi uyaramazsınız.");
            setShowModal(true);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, targetUserId);
        try {
            await updateDoc(userDocRef, {
                warned: {
                    isWarned: true,
                    reason: reason,
                    warnedBy: userId,
                    warnedAt: new Date().toISOString()
                }
            });
            setModalMessage(`${contacts.find(c => c.id === targetUserId)?.name || targetUserId} başarıyla uyarıldı.`);
            setShowModal(true);
        } catch (e) {
            setModalMessage("Kullanıcı uyarılırken bir hata oluştu.");
            setShowModal(true);
            console.error("Kullanıcı uyarılırken hata:", e);
        }
    };

    const handleDismissWarning = async () => {
        if (!db || !userId) return;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
        try {
            await updateDoc(userDocRef, {
                warned: { isWarned: false, reason: null, warnedBy: null, warnedAt: null }
            });
            setCurrentUser(prev => ({ ...prev, warned: { isWarned: false, reason: null, warnedBy: null, warnedAt: null } }));
            setModalMessage("Uyarıyı anladınız.");
            setShowModal(true);
        } catch (e) {
            setModalMessage("Uyarı durumu güncellenirken bir hata oluştu.");
            setShowModal(true);
            console.error("Uyarı durumu güncellenirken hata:", e);
        }
    };


    // Filtered lists for search
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFriends = currentUser?.friends?.filter(friendId => {
        const friend = contacts.find(c => c.id === friendId);
        return friend && friend.name.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];


    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Yükleniyor...</div>;
    }
    
    // Check for ban status first
    if (currentUser?.banned?.isBanned) {
        const bannedUntil = currentUser.banned.bannedUntil;
        if (bannedUntil && new Date(bannedUntil) < new Date()) {
            // Ban expired, unban automatically
            // This will trigger a re-render and show the main app
            handleUnbanUser(userId);
            return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Yasaklama süresi doldu, giriş yapılıyor...</div>;
        }
        return <BanScreen banInfo={currentUser.banned} />;
    }

    // Check for warning status
    if (currentUser?.warned?.isWarned) {
        return <WarningScreen warningInfo={currentUser.warned} onDismissWarning={handleDismissWarning} />;
    }

    // 1. Device Mode Selection Modal
    if (showDeviceModeSelectionModal) {
        return <DeviceModeSelectionModal isOpen={true} onClose={() => {}} onSelectMode={handleSelectDeviceMode} />;
    }

    // 2. Welcome Modal (only if device mode is selected and user hasn't seen it)
    if (selectedDeviceMode && currentUser && !currentUser.hasSeenWelcome && showWelcomeModal) {
        return <WelcomeModal isOpen={true} onClose={handleWelcomeModalClose} />;
    }

    // 3. Auth Modal (if not authenticated, after device mode and welcome)
    if (!userId && isAuthReady) {
        return <AuthModal isOpen={true} onClose={() => {}} auth={auth} db={db} appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'} setModalMessage={setModalMessage} setShowModal={setShowModal} onGuestLogin={handleGuestLogin} />;
    }

    const isGroupAdmin = selectedChat?.type === 'group' && selectedChat.adminIds && selectedChat.adminIds.includes(userId);
    const currentGroupData = selectedChat?.type === 'group' ? groups.find(g => g.id === selectedChat.id) : null;

    // Determine main layout classes based on selectedDeviceMode and isSmallScreen
    const mainContainerClasses = `flex w-full max-w-6xl h-[80vh] rounded-2xl shadow-xl overflow-hidden ${selectedDeviceMode === 'phone' && isSmallScreen ? 'flex-col' : 'md:flex-row flex-col'}`;
    const sidebarClasses = `w-full md:w-1/3 bg-gray-900 bg-opacity-30 p-4 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none ${selectedDeviceMode === 'phone' && isSmallScreen && !showSidebarOnMobile ? 'hidden' : ''} ${selectedDeviceMode === 'phone' && isSmallScreen && showSidebarOnMobile ? 'absolute inset-0 z-40' : ''}`;
    const chatWindowClasses = `w-full md:w-2/3 bg-gray-800 bg-opacity-50 p-4 flex flex-col rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none ${selectedDeviceMode === 'phone' && isSmallScreen && showSidebarOnMobile ? 'hidden' : ''}`;


    return (
        <div className="flex flex-col h-screen bg-gradient-to-r from-teal-300 via-blue-400 to-indigo-500 font-inter">
            <div className="container mx-auto p-4 flex-grow flex items-center justify-center">
                <div className={mainContainerClasses}>
                    {/* Sidebar */}
                    <div className={sidebarClasses}>
                        {selectedDeviceMode === 'phone' && isSmallScreen && (
                            <button
                                onClick={() => setShowSidebarOnMobile(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none z-50 p-2" // Increased padding for touch target
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        )}
                        {currentUser && (
                            <div className="flex items-center p-3 mb-3 rounded-xl bg-gray-700 bg-opacity-50 border border-blue-400">
                                <img src={currentUser.avatar} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Kullanıcı Resmi" />
                                <div className="flex-grow text-white ml-3">
                                    <span className="text-lg font-semibold">{currentUser.name}</span>
                                    <div className="flex items-center mt-1">
                                        <button onClick={() => setShowProfileEditModal(true)} className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-md mr-2">Profili Düzenle</button>
                                        <button onClick={() => auth.signOut()} className="text-xs bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md">Çıkış Yap</button>
                                    </div>
                                    <p className="text-xs text-gray-400 break-all mt-2 cursor-pointer" onClick={copyUserIdToClipboard} title="ID'yi Kopyala">ID: {userId}</p>
                                </div>
                            </div>
                        )}
                        {/* Search Bar */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Ara..."
                                className="w-full p-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                           <div
                                className={`relative flex items-center p-3 mb-3 rounded-xl cursor-pointer transition-colors duration-200 ${selectedChat?.id === 'public' ? 'bg-gray-700 bg-opacity-50 border border-blue-400' : 'hover:bg-gray-700 hover:bg-opacity-50'}`}
                                onClick={() => setSelectedChat({ id: 'public', name: 'Genel Sohbet', type: 'public' })}
                            >
                                <img src="https://placehold.co/150x150/82ccdd/FFFFFF?text=Genel" className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Genel Sohbet" />
                                <div className="flex-grow text-white ml-3">
                                    <span className="text-lg font-semibold">Genel Sohbet</span>
                                    <p className="text-sm text-gray-300">Herkese açık</p>
                                </div>
                                {Object.keys(unreadMessagesCount).length > 0 && unreadMessagesCount['public'] > 0 && (
                                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {unreadMessagesCount['public']}
                                    </span>
                                )}
                            </div>
                            <div className="text-white text-lg font-semibold mt-4 mb-2 flex justify-between items-center">
                                <span>Gruplar</span>
                                <button onClick={() => setShowGroupCreationModal(true)} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                </button>
                            </div>
                            {filteredGroups.map((group) => (
                                <div key={group.id} className={`relative flex items-center p-3 mb-3 rounded-xl cursor-pointer ${selectedChat?.id === group.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`} onClick={() => setSelectedChat({ id: group.id, name: group.name, type: 'group', adminIds: group.adminIds })}>
                                    <img src={`https://placehold.co/150x150/78e08f/FFFFFF?text=${group.name.substring(0,2).toUpperCase()}`} className="w-14 h-14 rounded-full" alt="Grup" />
                                    <div className="ml-3 text-white">
                                        <p className="font-semibold">{group.name}</p>
                                        <p className="text-sm text-gray-400">{group.members?.length || 0} Üye</p>
                                    </div>
                                    {Object.keys(unreadMessagesCount).length > 0 && unreadMessagesCount[group.id] > 0 && (
                                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            {unreadMessagesCount[group.id]}
                                        </span>
                                    )}
                                    {selectedChat?.id === group.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowInviteMemberModal(true); }}
                                            className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-md hover:bg-green-600"
                                            title="Üye Davet Et"
                                        >
                                            Davet Et
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div className="text-white text-lg font-semibold mt-4 mb-2">Arkadaşlar</div>
                            {filteredFriends.map(friendId => {
                                const friend = contacts.find(c => c.id === friendId);
                                const privateChatId = [userId, friendId].sort().join('_');
                                return friend ? (
                                    <div key={friend.id} className={`relative flex items-center p-3 mb-3 rounded-xl cursor-pointer ${selectedChat?.targetId === friend.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`} onClick={() => startPrivateChat(friend.id, friend.name)}>
                                        <img src={friend.avatar} className="w-14 h-14 rounded-full" alt="Arkadaş" />
                                        <div className="ml-3 text-white">
                                            <p className="font-semibold">{friend.name}</p>
                                            <p className="text-sm text-gray-400">{friend.status}</p>
                                        </div>
                                        {Object.keys(unreadMessagesCount).length > 0 && unreadMessagesCount[privateChatId] > 0 && (
                                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                {unreadMessagesCount[privateChatId]}
                                            </span>
                                        )}
                                    </div>
                                ) : null;
                            })}
                            <div className="text-white text-lg font-semibold mt-4 mb-2">Tüm Kullanıcılar</div>
                            {filteredContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center p-3 mb-3 rounded-xl hover:bg-gray-800 cursor-pointer" onClick={() => { setSelectedContactForProfile(contact); setShowContactProfileModal(true); }}>
                                     <img src={contact.avatar} className="w-14 h-14 rounded-full" alt="Kullanıcı" />
                                      <div className="ml-3 text-white">
                                        <p className="font-semibold">{contact.name}</p>
                                        <p className="text-sm text-yellow-400">★ {contact.averageRating ? contact.averageRating.toFixed(1) : 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-6">
                                <button onClick={() => setShowHelpCenterModal(true)} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
                                    Yardım Merkezi
                                </button>
                            </div>
                            <div className="mt-4">
                                <button onClick={() => setShowRightPanel(true)} className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center justify-center">
                                    Bildirimler & Yorumlar
                                    {Object.values(unreadMessagesCount).reduce((acc, curr) => acc + curr, 0) > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1.573l.67-.67a1 1 0 011.414 1.414l-1.67 1.67A1 1 0 0110 6.573V10a1 1 0 01-2 0V6.573l-1.67-1.67a1 1 0 011.414-1.414l.67.67V3a1 1 0 011-1zM4 10a1 1 0 011-1h.01a1 1 0 011 1v.01a1 1 0 01-1 1H5a1 1 0 01-1-1v-.01zm10 0a1 1 0 011-1h.01a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-.01zM10 16a1 1 0 01-1-1v-.01a1 1 0 011-1h.01a1 1 0 011 1v.01a1 1 0 01-1 1z"></path></svg>
                                            {Object.values(unreadMessagesCount).reduce((acc, curr) => acc + curr, 0)}
                                        </span>
                                    )}
                                </button>
                            </div>
                            <div className="mt-4">
                                <button onClick={() => setShowSettingsPanel(true)} className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">
                                    Ayarlar
                                </button>
                            </div>
                            <div className="text-center text-gray-400 text-xs mt-2">
                                {isSmallScreen ? "Mobil Mod" : "Masaüstü Mod"}
                            </div>
                        </div>
                    </div>
                    {/* Chat Window */}
                    <div className={chatWindowClasses}>
                        {selectedDeviceMode === 'phone' && isSmallScreen && (
                            <div className="flex items-center pb-4 border-b border-gray-700 mb-4">
                                <button
                                    onClick={() => setShowSidebarOnMobile(true)}
                                    className="text-gray-400 hover:text-white focus:outline-none mr-4 p-2" // Increased padding for touch target
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                                </button>
                                <img src={selectedChat?.type === 'public' ? 'https://placehold.co/150x150/82ccdd/FFFFFF?text=Genel' : selectedChat?.type === 'private' ? contacts.find(c => c.id === selectedChat.targetId)?.avatar || 'https://placehold.co/150x150/FF6347/FFFFFF?text=?' : `https://placehold.co/150x150/78e08f/FFFFFF?text=${selectedChat?.name.substring(0,2).toUpperCase()}` || 'https://placehold.co/150x150/FF6347/FFFFFF?text=??'} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Sohbet Partneri Resmi" />
                                <div className="flex-grow text-white ml-4">
                                    <span className="text-xl font-semibold">{selectedChat?.name || 'Sohbet Seçilmedi'}</span>
                                    <p className="text-sm text-gray-300">
                                        {selectedChat?.type === 'public' ? 'Herkese açık sohbet' : selectedChat?.type === 'group' ? `${groups.find(g => g.id === selectedChat.id)?.members?.length || 0} Üye` : 'Özel Sohbet'}
                                    </p>
                                </div>
                                {selectedChat.type === 'group' && (
                                    <div className="flex space-x-2 ml-auto">
                                        {isGroupAdmin && (
                                            <button
                                                onClick={() => setShowManageGroupMembersModal(true)}
                                                className="bg-purple-600 text-white text-xs px-3 py-1 rounded-md hover:bg-purple-700"
                                                title="Üyeleri Yönet"
                                            >
                                                Üyeleri Yönet
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleLeaveGroup(selectedChat.id)}
                                            className="bg-red-600 text-white text-xs px-3 py-1 rounded-md hover:bg-red-700"
                                            title="Gruptan Ayrıl"
                                        >
                                            Gruptan Ayrıl
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {!(selectedDeviceMode === 'phone' && isSmallScreen && showSidebarOnMobile) && selectedChat && (
                            <div className="flex items-center pb-4 border-b border-gray-700 mb-4 md:flex">
                                {!isSmallScreen && ( // Hamburger menü sadece mobil modda gözükmeli
                                    <img src={selectedChat?.type === 'public' ? 'https://placehold.co/150x150/82ccdd/FFFFFF?text=Genel' : selectedChat?.type === 'private' ? contacts.find(c => c.id === selectedChat.targetId)?.avatar || 'https://placehold.co/150x150/FF6347/FFFFFF?text=?' : `https://placehold.co/150x150/78e08f/FFFFFF?text=${selectedChat?.name.substring(0,2).toUpperCase()}` || 'https://placehold.co/150x150/FF6347/FFFFFF?text=??'} className="w-14 h-14 rounded-full border-2 border-white object-cover" alt="Sohbet Partneri Resmi" />
                                )}
                                <div className="flex-grow text-white ml-4">
                                    <span className="text-xl font-semibold">{selectedChat?.name || 'Sohbet Seçilmedi'}</span>
                                    <p className="text-sm text-gray-300">
                                        {selectedChat?.type === 'public' ? 'Herkese açık sohbet' : selectedChat?.type === 'group' ? `${groups.find(g => g.id === selectedChat.id)?.members?.length || 0} Üye` : 'Özel Sohbet'}
                                    </p>
                                </div>
                                {selectedChat.type === 'group' && (
                                    <div className="flex space-x-2 ml-auto">
                                        {isGroupAdmin && (
                                            <button
                                                onClick={() => setShowManageGroupMembersModal(true)}
                                                className="bg-purple-600 text-white text-xs px-3 py-1 rounded-md hover:bg-purple-700"
                                                title="Üyeleri Yönet"
                                            >
                                                Üyeleri Yönet
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleLeaveGroup(selectedChat.id)}
                                            className="bg-red-600 text-white text-xs px-3 py-1 rounded-md hover:bg-red-700"
                                            title="Gruptan Ayrıl"
                                        >
                                            Gruptan Ayrıl
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex mb-4 items-end ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== userId && <img src={contacts.find(c => c.id === msg.senderId)?.avatar || 'https://placehold.co/150x150/7f8c8d/ffffff?text=?'} className="w-10 h-10 rounded-full mr-3" alt="Sender Avatar" />}
                                    <div className={`relative px-4 py-2 rounded-2xl max-w-lg ${msg.senderId === userId ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                        <span className="block text-xs font-bold mb-1">{msg.senderName}</span>
                                        {msg.type === 'file' ? (
                                            msg.fileType && msg.fileType.startsWith('image/') ? (
                                                <img src={msg.fileUrl} alt={msg.fileName} className="max-w-xs max-h-48 object-contain rounded-md" />
                                            ) : (
                                                <div className="file-message flex items-center bg-white bg-opacity-10 p-2 rounded-lg cursor-pointer hover:bg-opacity-20" onClick={() => handleFileDownload(msg)}>
                                                    <svg className="w-8 h-8 mr-3 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-sm truncate">{msg.fileName}</p>
                                                        <p className="text-xs text-gray-300">{formatFileSize(msg.fileSize)}</p>
                                                    </div>
                                                    <svg className="w-6 h-6 ml-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                </div>
                                            )
                                        ) : msg.type === 'audio' ? (
                                            <div className="audio-message flex items-center bg-white bg-opacity-10 p-2 rounded-lg">
                                                <audio controls src={msg.audioUrl} className="w-full"></audio>
                                            </div>
                                        ) : (
                                            <p className="text-sm">{msg.text}</p>
                                        )}
                                        <div className="text-xs text-gray-400 text-right mt-1">{msg.timestamp}</div>
                                        {msg.senderId === userId && (
                                            <button
                                                onClick={() => deleteMessage(msg.id, msg.chatType, msg.chatTargetId)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs hover:bg-red-600 focus:outline-none"
                                                title="Mesajı Sil"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                    {msg.senderId === userId && <img src={currentUser?.avatar || 'https://placehold.co/150x150/7f8c8d/ffffff?text=?'} className="w-10 h-10 rounded-full ml-3" alt="My Avatar" />}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="pt-4 mt-4 border-t border-gray-700">
                            <div className="flex items-center bg-gray-700 rounded-full px-4 py-2">
                                <button className="text-gray-400 hover:text-white mr-2" onClick={() => document.getElementById('fileInput').click()}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13.5"></path></svg>
                                </button>
                                <input type="file" id="fileInput" className="hidden" onChange={handleFileUpload} />
                                <button
                                    className={`mr-2 p-2 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-red-500'}`}
                                    onClick={isRecording ? stopRecording : startRecording}
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        {isRecording ? (
                                            <path d="M6 6h12v12H6z" /> // Stop icon (square)
                                        ) : (
                                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.2-3c0 3.53-2.91 6.4-6.2 6.4S5.8 14.53 5.8 11H4c0 3.98 3.44 7.29 7.6 7.95V22h2.8v-3.05c4.16-.66 7.6-3.97 7.6-7.95h-1.8z"/> // Microphone icon
                                        )}
                                    </svg>
                                </button>
                                <input
                                    type="text"
                                    className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none mx-3"
                                    placeholder="Mesajınızı yazın..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleTextSend()}
                                />
                                <button className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700" onClick={handleTextSend}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Modals */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} message={modalMessage} />
            <ProfileEditModal isOpen={showProfileEditModal} onClose={() => setShowProfileEditModal(false)} currentUser={currentUser} onProfileUpdate={handleProfileUpdate} />
            <GroupCreationModal isOpen={showGroupCreationModal} onClose={() => setShowGroupCreationModal(false)} onCreateGroup={createNewGroup} existingGroupNames={existingGroupNames} />
            <ContactProfileModal isOpen={showContactProfileModal} onClose={() => setShowContactProfileModal(false)} contact={selectedContactForProfile} onAddFriend={addFriend} userId={userId} currentUserFriends={currentUser?.friends} onStartPrivateChat={startPrivateChat} onRateUser={handleRateUser} onCommentSubmit={handleCommentSubmit} onStartCall={startCall} onReportUser={handleReportUser} db={db} appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'} />
            <CallIncomingModal isOpen={showCallIncomingModal} onClose={() => setShowCallIncomingModal(false)} callerName={incomingCallData?.callerName} onAccept={handleAcceptCall} onReject={handleRejectCall} callType={incomingCallData?.type} />
            <HelpCenterModal isOpen={showHelpCenterModal} onClose={() => setShowHelpCenterModal(false)} userId={userId} currentUser={currentUser} db={db} appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'} setModalMessage={setModalMessage} setShowModal={setShowModal} ADMIN_ID={ADMIN_ID} />
            {selectedChat?.type === 'group' && (
                <InviteMemberModal
                    isOpen={showInviteMemberModal}
                    onClose={() => setShowInviteMemberModal(false)}
                    groupId={selectedChat.id}
                    groupName={selectedChat.name}
                    members={groups.find(g => g.id === selectedChat.id)?.members || []}
                    contacts={contacts}
                    onInviteMember={inviteUserToGroup}
                />
            )}
            {selectedChat?.type === 'group' && currentGroupData && (
                <ManageGroupMembersModal
                    isOpen={showManageGroupMembersModal}
                    onClose={() => setShowManageGroupMembersModal(false)}
                    group={currentGroupData}
                    contacts={contacts}
                    onRemoveMember={handleRemoveMember}
                    onBanMember={handleBanMember}
                    onUnbanMember={handleUnbanMember}
                    onPromoteAdmin={handlePromoteAdmin}
                    onDemoteAdmin={handleDemoteAdmin}
                    currentUserId={userId}
                />
            )}
            <RightPanel 
                isOpen={showRightPanel} 
                onClose={() => setShowRightPanel(false)} 
                unreadMessagesCount={unreadMessagesCount} 
                myComments={myComments}
                onSelectChatFromNotification={handleSelectChatFromNotification}
                groups={groups} // Pass groups to RightPanel for chat name resolution
                contacts={contacts} // Pass contacts to RightPanel for chat name resolution
                currentUserId={userId} // Pass currentUserId to RightPanel for chat name resolution
                isAdmin={userId === ADMIN_ID}
                adminReports={adminReports}
                onUpdateReportStatus={handleUpdateReportStatus}
                onOpenAdminBanModal={(reportedUserId) => {
                    setPreselectedBanOrWarnUserId(reportedUserId);
                    setShowAdminBanModal(true);
                }}
                onOpenAdminWarningModal={(reportedUserId) => {
                    setPreselectedBanOrWarnUserId(reportedUserId);
                    setShowAdminWarningModal(true);
                }}
            />
            <SettingsPanel
                isOpen={showSettingsPanel}
                onClose={() => setShowSettingsPanel(false)}
                currentUser={currentUser}
                onUpdateUserSettings={handleUpdateUserSettings}
                onSelectMode={handleSelectDeviceMode}
                onOpenAdminBanModal={() => {
                    setPreselectedBanOrWarnUserId(null); // Clear pre-selected user
                    setShowAdminBanModal(true);
                }}
                onOpenAdminWarningModal={() => {
                    setPreselectedBanOrWarnUserId(null); // Clear pre-selected user
                    setShowAdminWarningModal(true);
                }}
                isAdmin={userId === ADMIN_ID}
            />
            <AdminBanModal
                isOpen={showAdminBanModal}
                onClose={() => setShowAdminBanModal(false)}
                db={db}
                appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}
                setModalMessage={setModalMessage}
                setShowModal={setShowModal}
                contacts={contacts}
                onBanUser={handleBanUser}
                onUnbanUser={handleUnbanUser}
                preselectedUserId={preselectedBanOrWarnUserId}
            />
            <AdminWarningModal
                isOpen={showAdminWarningModal}
                onClose={() => setShowAdminWarningModal(false)}
                db={db}
                appId={typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}
                setModalMessage={setModalMessage}
                setShowModal={setShowModal}
                contacts={contacts}
                onWarnUser={handleWarnUser}
                preselectedUserId={preselectedBanOrWarnUserId}
            />
        </div>
    );
};

// Helper function not in component
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default App;
