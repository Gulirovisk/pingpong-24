import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import {
    getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
    collection, query, where, writeBatch
} from 'firebase/firestore';
import { ChevronsRight, Users, Shield, Plus, Trash2, Edit, Save, X, Trophy, Swords, ArrowRight, Shuffle, List, Settings, UserCheck } from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
// As variáveis __firebase_config e __initial_auth_token serão injetadas pelo ambiente.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
}; // Fallback para desenvolvimento local

const appId = process.env.REACT_APP_APP_ID || 'ping-pong-manager-default';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTES DE UI ---

const Modal = ({ children, isOpen, onClose, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-blue-400',
        secondary: 'bg-gray-600 hover:bg-gray-500 focus:ring-2 focus:ring-gray-400',
        danger: 'bg-red-600 hover:bg-red-500 focus:ring-2 focus:ring-red-400',
    };
    return (
        <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Input = ({ ...props }) => (
    <input
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        {...props}
    />
);

const Select = ({ children, ...props }) => (
    <select
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        {...props}
    >
        {children}
    </select>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg ${className}`}>
        {children}
    </div>
);

const Spinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
);


// --- LÓGICA DE NEGÓCIO ---

// Hook customizado para gerenciar CRUD e estado
const useFirestoreCollection = (collectionName, userId) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const collectionPath = `artifacts/${appId}/users/${userId}/${collectionName}`;

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setItems([]);
            return;
        };

        setLoading(true);
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const itemsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName, userId, collectionPath]);

    const addItem = async (data) => {
        if (!userId) return;
        await addDoc(collection(db, collectionPath), data);
    };

    const updateItem = async (id, data) => {
        if (!userId) return;
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, data);
    };

    const deleteItem = async (id) => {
        if (!userId) return;
        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
    };

    return { items, loading, addItem, updateItem, deleteItem };
};

// --- COMPONENTES PRINCIPAIS ---

function PlayersManager({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [editingPlayer, setEditingPlayer] = useState(null);

    const handleOpenModal = (player = null) => {
        setEditingPlayer(player);
        setNewPlayerName(player ? player.name : '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewPlayerName('');
        setEditingPlayer(null);
    };

    const handleSave = () => {
        if (newPlayerName.trim() === '') return;
        if (editingPlayer) {
            onUpdatePlayer(editingPlayer.id, { name: newPlayerName.trim() });
        } else {
            onAddPlayer({ name: newPlayerName.trim() });
        }
        handleCloseModal();
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users /> Jogadores</h2>
                <Button onClick={() => handleOpenModal()}><Plus size={18} /> Adicionar Jogador</Button>
            </div>
            <div className="space-y-2">
                {players.length > 0 ? (
                    players.map(player => (
                        <div key={player.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                            <span className="text-white">{player.name}</span>
                            <div className="flex gap-2">
                                <Button variant="secondary" className="p-2 h-auto" onClick={() => handleOpenModal(player)}><Edit size={16} /></Button>
                                <Button variant="danger" className="p-2 h-auto" onClick={() => onDeletePlayer(player.id)}><Trash2 size={16} /></Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">Nenhum jogador cadastrado.</p>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPlayer ? 'Editar Jogador' : 'Adicionar Jogador'}>
                <div className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Nome do jogador"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSave}><Save size={18}/> Salvar</Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

function TeamsManager({ teams, players, onAddTeam, onUpdateTeam, onDeleteTeam }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamData, setTeamData] = useState({ name: '', type: 'doubles', playerIds: [] });

    const handleOpenModal = (team = null) => {
        setEditingTeam(team);
        if (team) {
            setTeamData({ name: team.name, type: team.type, playerIds: team.playerIds });
        } else {
            setTeamData({ name: '', type: 'doubles', playerIds: [] });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTeam(null);
    };

    const handleSave = () => {
        if (teamData.name.trim() === '' || teamData.playerIds.length !== 2) {
            alert("Nome da equipe e exatamente 2 jogadores são obrigatórios.");
            return;
        }

        const playerNames = teamData.playerIds.map(id => players.find(p => p.id === id)?.name || '');
        const finalData = { ...teamData, playerNames, type: 'doubles' }; // Force type to doubles

        if (editingTeam) {
            onUpdateTeam(editingTeam.id, finalData);
        } else {
            onAddTeam(finalData);
        }
        handleCloseModal();
    };

    const handlePlayerSelection = (playerId) => {
        setTeamData(prev => {
            const newPlayerIds = prev.playerIds.includes(playerId)
                ? prev.playerIds.filter(id => id !== playerId)
                : [...prev.playerIds, playerId];

            if (newPlayerIds.length > 2) {
                 return { ...prev, playerIds: [newPlayerIds[newPlayerIds.length - 2], newPlayerIds[newPlayerIds.length-1]]};
            }
            return { ...prev, playerIds: newPlayerIds };
        });
    };
    
    const getPlayerNames = (team) => {
        return team.playerIds.map(id => players.find(p => p.id === id)?.name).filter(Boolean).join(' & ');
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Shield /> Equipes de Duplas</h2>
                <Button onClick={() => handleOpenModal()}><Plus size={18} /> Criar Equipe</Button>
            </div>
            <div className="space-y-2">
                {teams.length > 0 ? teams.map(team => (
                    <div key={team.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                        <div>
                            <p className="text-white font-semibold">{team.name}</p>
                            <p className="text-sm text-gray-400">{getPlayerNames(team)}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" className="p-2 h-auto" onClick={() => handleOpenModal(team)}><Edit size={16} /></Button>
                            <Button variant="danger" className="p-2 h-auto" onClick={() => onDeleteTeam(team.id)}><Trash2 size={16} /></Button>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-400">Nenhuma equipe de dupla criada.</p>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTeam ? 'Editar Equipe' : 'Criar Equipe'}>
                <div className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Nome da equipe"
                        value={teamData.name}
                        onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                    />
                    <div className="text-white">
                        <p className="font-semibold mb-2">Selecione 2 jogadores:</p>
                        <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-gray-900 rounded-lg">
                            {players.map(player => (
                                <label key={player.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={teamData.playerIds.includes(player.id)}
                                        onChange={() => handlePlayerSelection(player.id)}
                                        className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 rounded"
                                    />
                                    {player.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSave}><Save size={18} /> Salvar</Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

function ChampionshipsManager({ championships, teams, players, onAddChampionship, onDeleteChampionship, onSelectChampionship }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [champData, setChampData] = useState({ name: '', year: new Date().getFullYear(), participantType: 'player', participantIds: [] });

    const handleOpenModal = () => {
        setChampData({ name: '', year: new Date().getFullYear(), participantType: 'player', participantIds: [] });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleSave = () => {
        if (champData.name.trim() === '' || champData.participantIds.length < 2) {
            alert("Nome do campeonato e ao menos 2 participantes são obrigatórios.");
            return;
        }

        const initialConfig = {
            format: 'groups_then_knockout',
            groupStage: {
                generated: false,
                numGroups: 1,
                numAdvancing: 2,
                matchFormat: 'single'
            },
            matchSettings: {
                sets: 3
            },
            knockoutStage: {
                generated: false,
                rounds: []
            }
        };

        const finalData = {
            name: champData.name,
            year: parseInt(champData.year, 10) || new Date().getFullYear(),
            participantType: champData.participantType,
            participantIds: champData.participantIds,
            config: initialConfig,
            groups: [],
            standings: [],
        };
        onAddChampionship(finalData);
        handleCloseModal();
    };

    const handleParticipantSelection = (participantId) => {
        setChampData(prev => ({
            ...prev,
            participantIds: prev.participantIds.includes(participantId)
                ? prev.participantIds.filter(id => id !== participantId)
                : [...prev.participantIds, participantId]
        }));
    };
    
    const availableParticipants = champData.participantType === 'player' ? players : teams;

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy /> Campeonatos</h2>
                <Button onClick={handleOpenModal}><Plus size={18} /> Novo Campeonato</Button>
            </div>
            <div className="space-y-2">
                {championships.length > 0 ? championships.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                        <div>
                            <p className="text-white font-semibold">{c.name} - {c.year}</p>
                            <p className="text-sm text-gray-400">{c.participantIds.length} {c.participantType === 'player' ? 'jogadores' : 'equipes'}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button className="p-2 h-auto" onClick={() => onSelectChampionship(c.id)}><ChevronsRight size={16} /> Gerenciar</Button>
                            <Button variant="danger" className="p-2 h-auto" onClick={() => onDeleteChampionship(c.id)}><Trash2 size={16} /></Button>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-400">Nenhum campeonato criado.</p>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Novo Campeonato">
                <div className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Nome do Campeonato"
                        value={champData.name}
                        onChange={(e) => setChampData({ ...champData, name: e.target.value })}
                    />
                    <Input
                        type="number"
                        placeholder="Ano"
                        value={champData.year}
                        onChange={(e) => setChampData({ ...champData, year: e.target.value })}
                    />
                     <Select value={champData.participantType} onChange={(e) => setChampData({ ...champData, participantType: e.target.value, participantIds: [] })}>
                        <option value="player">Individual</option>
                        <option value="team">Duplas</option>
                    </Select>
                     <div className="text-white">
                        <p className="font-semibold mb-2">Selecione os participantes:</p>
                        <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-gray-900 rounded-lg">
                            {availableParticipants.length > 0 ? availableParticipants.map(p => (
                                <label key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={champData.participantIds.includes(p.id)}
                                        onChange={() => handleParticipantSelection(p.id)}
                                        className="form-checkbox h-5 w-5 bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 rounded"
                                    />
                                    {p.name}
                                </label>
                            )) : <p className="text-gray-500 text-center p-2">Nenhum participante disponível para este tipo.</p>}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSave}><Save size={18} /> Criar Campeonato</Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

function ChampionshipDetail({ championship, teams, players, onBack, onUpdateChampionship, userId }) {
    const [activeTab, setActiveTab] = useState('groups');
    const [matches, setMatches] = useState([]);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [isScoreModalOpen, setScoreModalOpen] = useState(false);
    const [isConfigModalOpen, setConfigModalOpen] = useState(false);
    const [isManualMatchModalOpen, setManualMatchModalOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [matchScore, setMatchScore] = useState({ home: '', away: '' });
    const [currentConfig, setCurrentConfig] = useState(championship.config);
    const [manualMatchData, setManualMatchData] = useState({ homeParticipantId: '', awayParticipantId: ''});
    
    const participantMap = useMemo(() => {
        const map = new Map();
        const source = championship.participantType === 'player' ? players : teams;
        source.forEach(p => map.set(p.id, p));
        return map;
    }, [championship.participantType, players, teams]);

    const participants = useMemo(() => {
        return championship.participantIds.map(id => participantMap.get(id)).filter(Boolean);
    }, [championship.participantIds, participantMap]);
    
    const collectionPath = `artifacts/${appId}/users/${userId}/championships/${championship.id}/matches`;

    useEffect(() => {
        if (!userId) {
            setLoadingMatches(false);
            setMatches([]);
            return;
        }

        setLoadingMatches(true);
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const matchesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMatches(matchesData);
            setLoadingMatches(false);
        }, (error) => {
            console.error(`Error fetching matches:`, error);
            setLoadingMatches(false);
        });

        return () => unsubscribe();
    }, [userId, championship.id, collectionPath]);

    const addMatch = async (data) => {
        if (!userId) return;
        await addDoc(collection(db, collectionPath), data);
    };

    const updateMatch = async (id, data) => {
        if (!userId) return;
        const docRef = doc(db, collectionPath, id);
        await updateDoc(docRef, data);
    };
    
    const handleRecalculateStandings = useCallback(async (champ, updatedMatches, groupName) => {
        const group = champ.groups.find(g => g.name === groupName);
        if (!group) return;

        let standings = group.participantIds.map(participantId => ({
            participantId,
            played: 0, wins: 0, losses: 0,
            setsFor: 0, setsAgainst: 0, setDifference: 0, points: 0,
        }));
        
        const groupMatches = updatedMatches.filter(m => m.groupName === groupName && m.status === 'completed');

        groupMatches.forEach(match => {
            const homeParticipantStats = standings.find(s => s.participantId === match.homeParticipantId);
            const awayParticipantStats = standings.find(s => s.participantId === match.awayParticipantId);
            
            if (homeParticipantStats) {
                homeParticipantStats.played += 1;
                homeParticipantStats.setsFor += match.homeSets;
                homeParticipantStats.setsAgainst += match.awaySets;
                if (match.homeSets > match.awaySets) {
                    homeParticipantStats.wins += 1;
                    homeParticipantStats.points += 2;
                } else {
                    homeParticipantStats.losses += 1;
                    homeParticipantStats.points += 1;
                }
            }
            if (awayParticipantStats) {
                awayParticipantStats.played += 1;
                awayParticipantStats.setsFor += match.awaySets;
                awayParticipantStats.setsAgainst += match.homeSets;
                 if (match.awaySets > match.homeSets) {
                    awayParticipantStats.wins += 1;
                    awayParticipantStats.points += 2;
                } else {
                    awayParticipantStats.losses += 1;
                    awayParticipantStats.points += 1;
                }
            }
        });

        standings.forEach(s => {
            s.setDifference = s.setsFor - s.setsAgainst;
        });

        standings.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.setDifference !== b.setDifference) return b.setDifference - a.setDifference;
            if (a.setsFor !== b.setsFor) return b.setsFor - a.setsFor;
            return 0;
        });

        const newStandings = champ.standings.filter(s => s.groupName !== groupName);
        newStandings.push({ groupName, table: standings });
        
        await onUpdateChampionship(champ.id, { standings: newStandings });

    }, [onUpdateChampionship]);

    const openScoreModal = (match) => {
        setEditingMatch(match);
        setMatchScore({ home: '', away: '' }); // Reset score on open
        setScoreModalOpen(true);
    };

    const handleSaveScore = async () => {
        if (!editingMatch) return;
        const updatedMatchData = {
            homeSets: parseInt(matchScore.home, 10) || 0,
            awaySets: parseInt(matchScore.away, 10) || 0,
            status: 'completed'
        };
        await updateMatch(editingMatch.id, updatedMatchData);

        const updatedMatches = matches.map(m => m.id === editingMatch.id ? {...m, ...updatedMatchData} : m);
        if (editingMatch.stage === 'group') {
            handleRecalculateStandings(championship, updatedMatches, editingMatch.groupName);
        }
        
        setScoreModalOpen(false);
        setEditingMatch(null);
    };
    
    const handleGenerateGroups = async () => {
        if (participants.length < 2 || championship.config.groupStage.numGroups < 1) {
            alert("É necessário ter ao menos 2 participantes e 1 grupo para gerar as chaves.");
            return;
        }

        const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
        const numGroups = championship.config.groupStage.numGroups;
        const newGroups = Array.from({ length: numGroups }, (_, i) => ({
            name: `Grupo ${String.fromCharCode(65 + i)}`,
            participantIds: []
        }));

        shuffledParticipants.forEach((p, index) => {
            newGroups[index % numGroups].participantIds.push(p.id);
        });

        const newStandings = newGroups.map(g => ({
            groupName: g.name,
            table: g.participantIds.map(pid => ({ participantId: pid, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, setDifference: 0, points: 0 }))
        }));

        await onUpdateChampionship(championship.id, { 
            groups: newGroups,
            standings: newStandings,
            'config.groupStage.generated': true
         });
    };

    const handleGenerateMatches = async () => {
        const batch = writeBatch(db);

        championship.groups.forEach(group => {
            for (let i = 0; i < group.participantIds.length; i++) {
                for (let j = i + 1; j < group.participantIds.length; j++) {
                    const homeId = group.participantIds[i];
                    const awayId = group.participantIds[j];
                    
                    const matchBase = {
                        stage: 'group',
                        groupName: group.name,
                        homeParticipantId: homeId,
                        awayParticipantId: awayId,
                        homeParticipantName: participantMap.get(homeId)?.name || '?',
                        awayParticipantName: participantMap.get(awayId)?.name || '?',
                        homeSets: null,
                        awaySets: null,
                        status: 'pending'
                    };

                    const newMatchRef = doc(collection(db, collectionPath));
                    batch.set(newMatchRef, matchBase);

                    if (championship.config.groupStage.matchFormat === 'home_and_away') {
                         const newReturnMatchRef = doc(collection(db, collectionPath));
                         batch.set(newReturnMatchRef, {
                            ...matchBase,
                            homeParticipantId: awayId,
                            awayParticipantId: homeId,
                            homeParticipantName: participantMap.get(awayId)?.name || '?',
                            awayParticipantName: participantMap.get(homeId)?.name || '?',
                        });
                    }
                }
            }
        });
        
        await batch.commit();
        alert("Partidas da fase de grupos geradas!");
    };
    
    const handleSaveConfig = async () => {
        const configToSave = {
            ...currentConfig,
            matchSettings: {
                ...currentConfig.matchSettings,
                sets: parseInt(currentConfig.matchSettings.sets, 10) || 3,
            },
            groupStage: {
                ...currentConfig.groupStage,
                numGroups: parseInt(currentConfig.groupStage.numGroups, 10) || 1,
                numAdvancing: parseInt(currentConfig.groupStage.numAdvancing, 10) || 2,
            },
        };
        await onUpdateChampionship(championship.id, { config: configToSave });
        setConfigModalOpen(false);
    };
    
    const handleSaveManualMatch = async () => {
        const { homeParticipantId, awayParticipantId } = manualMatchData;
        if(!homeParticipantId || !awayParticipantId || homeParticipantId === awayParticipantId){
            alert("Selecione dois participantes diferentes.");
            return;
        }

        const matchData = {
            stage: 'group',
            groupName: 'Avulso',
            homeParticipantId,
            awayParticipantId,
            homeParticipantName: participantMap.get(homeParticipantId)?.name || '?',
            awayParticipantName: participantMap.get(awayParticipantId)?.name || '?',
            homeSets: null,
            awaySets: null,
            status: 'pending'
        }
        await addMatch(matchData);
        setManualMatchModalOpen(false);
    }
    
    const renderContent = () => {
        switch (activeTab) {
            case 'groups':
                return (
                    <div>
                        {!championship.config.groupStage.generated ? (
                            <div className="text-center p-8">
                                <p className="text-gray-300 mb-4">A fase de grupos ainda não foi gerada.</p>
                                <Button onClick={handleGenerateGroups}><Shuffle size={18}/> Gerar Grupos Aleatoriamente</Button>
                            </div>
                        ) : (
                            championship.standings.map(standing => (
                               <Card key={standing.groupName} className="mb-6">
                                    <h3 className="text-xl font-bold text-blue-400 mb-4">{standing.groupName}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-gray-300">
                                            <thead>
                                                <tr className="border-b border-gray-600">
                                                    <th className="p-2">#</th>
                                                    <th className="p-2">Participante</th>
                                                    <th className="p-2 text-center">P</th>
                                                    <th className="p-2 text-center">J</th>
                                                    <th className="p-2 text-center">V</th>
                                                    <th className="p-2 text-center">D</th>
                                                    <th className="p-2 text-center">SP</th>
                                                    <th className="p-2 text-center">SC</th>
                                                    <th className="p-2 text-center">SD</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {standing.table.map((row, index) => (
                                                <tr key={row.participantId} className="border-b border-gray-700 last:border-0">
                                                    <td className="p-2 font-bold">{index + 1}</td>
                                                    <td className="p-2 font-semibold">{participantMap.get(row.participantId)?.name || 'Desconhecido'}</td>
                                                    <td className="p-2 text-center text-lg font-bold text-white">{row.points}</td>
                                                    <td className="p-2 text-center">{row.played}</td>
                                                    <td className="p-2 text-center text-green-400">{row.wins}</td>
                                                    <td className="p-2 text-center text-red-400">{row.losses}</td>
                                                    <td className="p-2 text-center">{row.setsFor}</td>
                                                    <td className="p-2 text-center">{row.setsAgainst}</td>
                                                    <td className="p-2 text-center">{row.setDifference}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                               </Card>
                            ))
                        )}
                    </div>
                );
            case 'matches':
                return (
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Partidas</h3>
                            <div className="flex gap-2">
                                <Button onClick={() => setManualMatchModalOpen(true)} variant="secondary"><Plus size={18}/> Partida Manual</Button>
                                <Button onClick={handleGenerateMatches} disabled={!championship.config.groupStage.generated || matches.length > 0}><Shuffle size={18}/> Gerar Partidas dos Grupos</Button>
                            </div>
                        </div>
                        {loadingMatches ? <Spinner /> : (
                            <div className="space-y-3">
                                {matches.sort((a,b) => a.groupName?.localeCompare(b.groupName)).map(match => (
                                    <div key={match.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <span className="font-semibold w-1/4 text-right truncate">{match.homeParticipantName}</span>
                                            {match.status === 'completed' ? (
                                                <div className="flex items-center gap-2 font-bold text-xl">
                                                    <span className={`px-3 py-1 rounded ${match.homeSets > match.awaySets ? 'bg-green-500 text-white' : 'bg-gray-600'}`}>{match.homeSets}</span>
                                                    <span className="text-gray-400">x</span>
                                                     <span className={`px-3 py-1 rounded ${match.awaySets > match.homeSets ? 'bg-green-500 text-white' : 'bg-gray-600'}`}>{match.awaySets}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 font-bold text-xl">vs</span>
                                            )}
                                            <span className="font-semibold w-1/4 text-left truncate">{match.awayParticipantName}</span>
                                        </div>
                                        <div className="w-1/4 text-right">
                                            {match.status === 'pending' && (
                                                <Button onClick={() => openScoreModal(match)}>
                                                    <Edit size={16}/> Lançar Placar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            case 'settings':
                return(
                    <Card>
                         <h3 className="text-xl font-bold text-white mb-4">Configurações do Campeonato</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="text-gray-300 font-semibold">Formato dos Jogos (Sets)</label>
                                <Select value={currentConfig.matchSettings.sets} onChange={e => setCurrentConfig({...currentConfig, matchSettings: {...currentConfig.matchSettings, sets: e.target.value }})}>
                                    <option value={1}>Melhor de 1</option>
                                    <option value={3}>Melhor de 3</option>
                                    <option value={5}>Melhor de 5</option>
                                    <option value={7}>Melhor de 7</option>
                                </Select>
                            </div>
                            <div>
                                <label className="text-gray-300 font-semibold">Formato da Fase de Grupos</label>
                                 <Select value={currentConfig.groupStage.matchFormat} onChange={e => setCurrentConfig({...currentConfig, groupStage: {...currentConfig.groupStage, matchFormat: e.target.value}})}>
                                    <option value="single">Apenas Ida</option>
                                    <option value="home_and_away">Ida e Volta</option>
                                </Select>
                            </div>
                             <div>
                                <label className="text-gray-300 font-semibold">Número de Grupos</label>
                                <Input type="number" min="1" value={currentConfig.groupStage.numGroups} onChange={e => setCurrentConfig({...currentConfig, groupStage: {...currentConfig.groupStage, numGroups: e.target.value }})} />
                            </div>
                             <div>
                                <label className="text-gray-300 font-semibold">Participantes que avançam por grupo</label>
                                <Input type="number" min="1" value={currentConfig.groupStage.numAdvancing} onChange={e => setCurrentConfig({...currentConfig, groupStage: {...currentConfig.groupStage, numAdvancing: e.target.value }})} />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveConfig}><Save size={18}/> Salvar Configurações</Button>
                            </div>
                         </div>
                    </Card>
                );
            default: return null;
        }
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4">
                <ArrowRight className="transform rotate-180" size={18}/> Voltar para a lista
            </Button>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white">{championship.name} - {championship.year}</h2>
                <p className="text-blue-400">{participants.length} {championship.participantType === 'player' ? 'Jogadores' : 'Equipes'} - {championship.participantType === 'player' ? "Individual" : "Duplas"}</p>
            </div>
            <div className="flex justify-center border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'groups' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}><List size={18}/> Grupos & Classificação</button>
                <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'matches' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}><Swords size={18}/> Partidas</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}><Settings size={18}/> Configurações</button>
            </div>
            <div>{renderContent()}</div>
            <Modal isOpen={isScoreModalOpen} onClose={() => setScoreModalOpen(false)} title="Lançar Placar da Partida">
                {editingMatch && <div className="space-y-4">
                    <div className="text-center text-white text-lg font-bold">
                        {editingMatch.homeParticipantName} <span className="text-gray-400">vs</span> {editingMatch.awayParticipantName}
                    </div>
                    <div className="flex justify-around items-center">
                         <Input type="number" min="0" value={matchScore.home} onChange={e => setMatchScore({...matchScore, home: e.target.value})} className="w-24 text-center text-2xl text-yellow-300"/>
                         <span className="text-white text-2xl">x</span>
                         <Input type="number" min="0" value={matchScore.away} onChange={e => setMatchScore({...matchScore, away: e.target.value})} className="w-24 text-center text-2xl text-yellow-300"/>
                    </div>
                     <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setScoreModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveScore}><Save size={18}/> Salvar Placar</Button>
                    </div>
                </div>}
            </Modal>
             <Modal isOpen={isManualMatchModalOpen} onClose={() => setManualMatchModalOpen(false)} title="Criar Partida Manual">
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-300 font-semibold mb-1 block">Participante da Casa</label>
                        <Select value={manualMatchData.homeParticipantId} onChange={e => setManualMatchData({...manualMatchData, homeParticipantId: e.target.value})}>
                            <option value="">Selecione</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="text-gray-300 font-semibold mb-1 block">Participante Visitante</label>
                        <Select value={manualMatchData.awayParticipantId} onChange={e => setManualMatchData({...manualMatchData, awayParticipantId: e.target.value})}>
                            <option value="">Selecione</option>
                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setManualMatchModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveManualMatch}><Save size={18}/> Criar Partida</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function App() {
    const [userId, setUserId] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    
    const { items: players, loading: loadingPlayers, addItem: addPlayer, updateItem: updatePlayer, deleteItem: deletePlayer } = useFirestoreCollection('players', userId);
    const { items: teams, loading: loadingTeams, addItem: addTeam, updateItem: updateTeam, deleteItem: deleteTeam } = useFirestoreCollection('teams', userId);
    const { items: championships, loading: loadingChampionships, addItem: addChampionship, updateItem: updateChampionship, deleteItem: deleteChampionship } = useFirestoreCollection('championships', userId);

    const [selectedChampionshipId, setSelectedChampionshipId] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
            setAuthReady(true);
        });

        const performInitialSignIn = async () => {
            if (!auth.currentUser) {
                try {
                    const token = typeof __initial_auth_token !== 'undefined' && __initial_auth_token ? __initial_auth_token : null;
                    if (token) {
                        await signInWithCustomToken(auth, token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Erro no login inicial:", error);
                    try {
                        await signInAnonymously(auth);
                    } catch (anonError) {
                        console.error("Falha no login anônimo de fallback:", anonError);
                    }
                }
            }
        };

        performInitialSignIn();
        return () => unsubscribe();
    }, []);

    const selectedChampionship = useMemo(() => {
        return championships.find(c => c.id === selectedChampionshipId);
    }, [championships, selectedChampionshipId]);

    if (!authReady || loadingPlayers || loadingTeams || loadingChampionships) {
        return (
            <div className="bg-gray-900 min-h-screen flex justify-center items-center">
                <Spinner />
            </div>
        );
    }
    
    if (!userId) {
        return (
            <div className="bg-gray-900 min-h-screen text-white flex justify-center items-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500">Erro de Autenticação</h1>
                    <p className="text-gray-400 mt-2">Não foi possível autenticar o usuário. Por favor, recarregue a página.</p>
                     <p className="text-xs text-gray-500 mt-4">User ID: Não disponível</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold text-center tracking-tight text-white">Gerenciador de Campeonatos <span className="text-blue-500">de Ping Pong</span></h1>
                    <p className="text-center text-gray-400 mt-2">Crie, gerencie e acompanhe seus torneios com facilidade.</p>
                    <p className="text-center text-xs text-gray-600 mt-2">User ID: {userId}</p>
                </header>

                {selectedChampionship ? (
                    <ChampionshipDetail 
                        championship={selectedChampionship} 
                        teams={teams}
                        players={players}
                        onBack={() => setSelectedChampionshipId(null)}
                        onUpdateChampionship={updateChampionship}
                        userId={userId}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <PlayersManager 
                                players={players}
                                onAddPlayer={addPlayer}
                                onUpdatePlayer={updatePlayer}
                                onDeletePlayer={deletePlayer}
                            />
                             <TeamsManager 
                                teams={teams}
                                players={players}
                                onAddTeam={addTeam}
                                onUpdateTeam={updateTeam}
                                onDeleteTeam={deleteTeam}
                            />
                        </div>
                         <ChampionshipsManager 
                            championships={championships}
                            teams={teams}
                            players={players}
                            onAddChampionship={addChampionship}
                            onDeleteChampionship={deleteChampionship}
                            onSelectChampionship={setSelectedChampionshipId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
