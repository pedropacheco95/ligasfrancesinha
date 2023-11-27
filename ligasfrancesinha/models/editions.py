
import random

from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer , String , Float, ForeignKey , Boolean, Date
from sqlalchemy.orm import relationship

from ligasfrancesinha.tools.input_tools import Field, Block , Form
from datetime import datetime, timedelta

class Edition(db.Model ,model.Model , model.Base):
    __tablename__ = 'editions'
    __table_args__ = {'extend_existing': True}
    page_title = 'Edições'
    model_name = 'Edition'

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    time = Column(String(10))
    final_game = Column(Date)
    has_ended = Column(Boolean,default=False)
    goal_value = Column(Float,default=0.1)
    number_of_teams_made = Column(Integer,default=0)
    league_id = Column(Integer, ForeignKey('leagues.id'))
    last_team = Column(String(40))

    games = relationship('Game', back_populates='edition', cascade="all, delete-orphan")
    league = relationship('League',back_populates='editions')
    players_relations = relationship('Association_PlayerEdition', back_populates='edition', cascade="all, delete-orphan")

    def display_all_info(self):
        searchable_column = {'field': 'name','label':'Nome'}
        table_columns = [
            {'field': 'time','label':'Hora'},
            searchable_column,
            {'field': 'has_ended','label':'Já acabou?'},
            {'field': 'number_of_teams_made','label':'Equipas criadas'},
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model)
        form = Form()

        # Create Info block
        fields = [
            get_field(name='name',label='Nome',type='Text',required=False),
            get_field(name='time',label='Hora',type='Text',required=False),
            get_field(name='final_game',label='Jogo Final',type='Date',required=False),
            get_field(name='has_ended',label='Já acabou?',type='Boolean',required=False),
            get_field(name='goal_value',label='Valor do golo',type='Float',required=False),
            get_field(name='number_of_teams_made',label='Numero de equipas feitas',type='Integer',required=False),
            get_field(name='last_team',label='Últimas Equipas',type='Text',required=False),
            get_field(name='games',label='Jogos',type='OneToMany',related_model='Game'),
            get_field(name='league',label='Liga',type='ManyToOne',related_model='League'),
            get_field(name='players_relations',label='Jogadores (Relações)',type='OneToMany',related_model='Association_PlayerEdition'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form

    def get_number_of_players(self):
        return len(self.players_relations)

    def get_ordered_games(self):
        self.games.sort(key=lambda x: x.matchweek)
        return self.games

    def get_played_matches(self):
        #[game for game in self.games if game.played]
        return self.games

    def players_classification(self,update_places=None):
        return [rel.player for rel in self.players_relations_classification(update_places)]

    def players_relations_classification(self,update_places=None):
        sorted_by_points = self.players_relations
        sorted_by_points.sort(key=lambda x: x.points, reverse=True)
        incomplete_relation = [rel for rel in self.players_relations if not rel.place]
        if update_places or incomplete_relation:
            for index,rel in enumerate(sorted_by_points):
                rel.last_place = rel.place
                rel.place = index + 1
                rel.save()
        return sorted_by_points

    def players_relations_classification_by_goals(self):
        sorted_by_goals = self.players_relations
        sorted_by_goals.sort(key=lambda x: x.goals, reverse=True)
        return sorted_by_goals

    def player_position(self,player):
        return self.players_classification().index(player) + 1
    
    def player_in_position(self, position):
        return self.players_classification()[position-1]

    def last_updated_matchweek(self):
        return self.players_relations[0].matchweek

    def matchweek_updated(self):
        last_upadted_matchweek = self.last_updated_matchweek()
        matchweek = self.get_ordered_games()[-1].matchweek if self.get_ordered_games() else 0
        return last_upadted_matchweek == matchweek

    def update_table(self,force_update=False):
        matchweek = self.get_ordered_games()[-1].matchweek if self.get_ordered_games() else 0
        if not self.matchweek_updated() or force_update:
            for relation in self.players_relations:
                player = relation.player
                games_won , games_drawn , games_lost = player.get_all_results(self)
                wins = len(games_won)
                draws = len(games_drawn)
                losts = len(games_lost)
                goals = player.goals(self)
                goals_scored_by_team = player.goals_scored_by_team(self)
                goals_suffered_by_team = player.goals_suffered_by_team(self)

                points = wins * 4 + draws * 2 + losts + goals * self.goal_value
                appearances = len(player.games_played_on_edition(self))
                percentage_of_appearances = round((appearances / len(self.get_played_matches()))*100,2)

                relation.points = points
                relation.appearances = appearances
                relation.percentage_of_appearances = percentage_of_appearances
                relation.wins = wins
                relation.draws = draws
                relation.losts = losts
                relation.goals = goals
                relation.goals_scored_by_team = goals_scored_by_team
                relation.goals_suffered_by_team = goals_suffered_by_team
                relation.matchweek = matchweek
                relation.save()

        self.players_classification(update_places=True) 
        return True

    """ def add_game_to_table(self,game):
        for game_relation in game.players_relations:
            goals = game_relation.goals
            win = 1 if (game.winner == 1 and game_relation.team == 'Branquelas') or  (game.winner == -1 and game_relation.team == 'Maregões') else 0
            draw = 1 if game.winner == 0 else 0
            lost = 1 if (game.winner == -1 and game_relation.team == 'Branquelas') or  (game.winner == 1 and game_relation.team == 'Maregões') else 0
            goals_scored_by_team = game.goals_team1
            goals_suffered_by_team = game.goals_team2

            points = win*3 + draw*1 

            edition_relation = [relation for relation in game_relation.player.editions_relations if relation.edition == self][0]
            edition_relation.points += points
            edition_relation.appearances += 1
            edition_relation.percentage_of_appearances = round((edition_relation.appearances / len(self.games))*100,2)
            edition_relation.wins += win
            edition_relation.draws += draw
            edition_relation.losts += lost
            edition_relation.goals = goals
            edition_relation.goals_scored_by_team += goals_scored_by_team
            edition_relation.goals_suffered_by_team += goals_suffered_by_team
            edition_relation.matchweek = game.matchweek
            edition_relation.save()
        self.players_classification(update_places=True) 
        return True """

    def players_ids_last_team(self):
        players = [rel.player.id for rel in self.players_relations]
        if self.last_team:
            players = [int(player_id) for player_id in self.last_team[:-1].split(';')]
        return players

    def make_teams(self):

        if len(self.games) < self.number_of_teams_made:
            player_ids = self.players_ids_last_team()
            players_keys = {rel.player.id:rel.player for rel in self.players_relations}
            players = [players_keys[id] for id in player_ids]
            mid_index = len(players) // 2

            teams = {
                'Branquelas': players[:mid_index],
                'Maregões': players[mid_index:]
            }

            return teams

        players = self.players_classification(update_places=True)

        if self.league.name == 'MasterLeague':
            random.shuffle(players)

        even_players = len(players)/2 % 2 == 0
        teams = {'Branquelas': [], 'Maregões': []}
        order = [teams['Branquelas'], teams['Maregões']]
        flip = False
        count = 1

        while players:
            if len(players) == 2 and flip and not even_players:
                order[not flip].append(players.pop(-1))
                order[flip].append(players.pop(0))
            else:
                team = order[flip]
                team.extend([players.pop(0), players.pop(-1) if players else None])
                team.remove(None) if None in team else None
                flip = not flip
            if count % 2 == 0:
                flip = not flip
            count += 1

        last_team = ''
        for key in teams:
            for player in teams[key]:
                last_team += '{player_id};'.format(player_id = player.id)

        self.last_team = last_team
        self.number_of_teams_made += 1
        self.save()

        return teams

    def replace_players(self,player_1,player_2):
        edition_players_ids = [rel.player.id for rel in self.players_relations]
        rel = next((rel for rel in self.players_relations if rel.player_id == player_1.id), None)
        if player_2.id in edition_players_ids or not rel:
            return False
        relations = player_1.get_games_relations_played(self)
        for relation in relations:
            relation.player_id = player_2.id
            relation.player = player_2
        rel.player_id = player_2.id
        rel.player = player_2
        self.update_table(True)
        return True
    
    def next_game_datetime(self):
        final_game_datetime = datetime.combine(self.final_game, datetime.min.time())
        day_of_week = final_game_datetime.weekday()
        today = datetime.today()
        days_until_next = (day_of_week - today.weekday() + 7) % 7
        next_game_date = today + timedelta(days=days_until_next)
        next_game_time = datetime.strptime(self.time, '%H:%M').time()
        next_game_datetime = datetime.combine(next_game_date, next_game_time)
        return next_game_datetime.strftime('%Y-%m-%dT%H:%M')