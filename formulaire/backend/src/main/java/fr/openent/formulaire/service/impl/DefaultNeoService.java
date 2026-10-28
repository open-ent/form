package fr.openent.formulaire.service.impl;

import fr.openent.formulaire.service.NeoService;
import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.neo4j.Neo4jResult;

import static fr.openent.form.core.constants.Fields.*;

public class DefaultNeoService implements NeoService {

    @Override
    public void getUsers(final JsonArray usersIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject().put(PARAM_USERS_IDS, usersIds);

        String queryUsersNeo4j = "MATCH (u:User) WHERE  u.id IN $usersIds " +
                "RETURN u.id AS id, u.id as username, u.email AS email, u.firstName AS firstname, u.lastName AS lastname";

        Neo4j.getInstance().execute(queryUsersNeo4j, params, Neo4jResult.validResultHandler(handler));
    }

    @Override
    public void getGroups(final JsonArray groupsIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject().put(PARAM_GROUPS_IDS, groupsIds);

        String queryGroupsNeo4j = "MATCH(g:Group)-[:IN]-(ug:User) WHERE g.id  IN $groupsIds " +
                        "WITH g, collect({id: ug.id, username: ug.id, email: ug.email, firstname: ug.firstName, lastname: ug.lastName}) AS users " +
                        "return \"GR_\"+g.id AS id, g.name AS name, users";

        Neo4j.getInstance().execute(queryGroupsNeo4j, params, Neo4jResult.validResultHandler(handler));
    }

    @Override
    public void getSharedBookMark(final JsonArray bookmarksIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject()
                .put(PARAM_BOOKMARKS_IDS, bookmarksIds);

        String queryNeo4j = "WITH $bookmarksIds AS shareBookmarkIds " +
                "UNWIND shareBookmarkIds AS shareBookmarkId MATCH (u:User)-[:HAS_SB]->(sb:ShareBookmark) " +
                "UNWIND TAIL(sb[shareBookmarkId]) as vid MATCH (v:Visible {id : vid}) WHERE v.deleteDate IS NULL " +
                "WITH {group: {id: \"SB\" + shareBookmarkId, name: HEAD(sb[shareBookmarkId]), users: COLLECT(DISTINCT{id: v.id, " +
                "email: v.email, lastname: v.lastName, firstname: v.firstName, username: v.id})}}as sharedBookMark " +
                "RETURN COLLECT(sharedBookMark) as bookmarks;";

        Neo4j.getInstance().execute(queryNeo4j, params, Neo4jResult.validResultHandler(handler));
    }

    @Override
    public void getSharedBookMarkUsers(final JsonArray bookmarksIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject()
                .put(PARAM_BOOKMARKS_IDS, bookmarksIds);

        String queryNeo4j = "WITH $bookmarksIds AS shareBookmarkIds UNWIND shareBookmarkIds AS shareBookmarkId MATCH (u:User)-[:HAS_SB]->(sb:ShareBookmark) UNWIND TAIL(sb[shareBookmarkId]) as vid " +
                "MATCH (v:Visible {id : vid})<-[:IN]-(us:User) WHERE v.deleteDate IS NULL and v:ProfileGroup WITH {id: shareBookmarkId, name: HEAD(sb[shareBookmarkId]), users: COLLECT(DISTINCT{id: us.id, email: us.email, lastname: us.lastName, firstname: us.firstName, username: us.id})} as sharedBookMark " +
                "RETURN sharedBookMark " +
                "UNION " +
                "WITH $bookmarksIds AS shareBookmarkIds UNWIND shareBookmarkIds AS shareBookmarkId MATCH (u:User)-[:HAS_SB]->(sb:ShareBookmark) UNWIND TAIL(sb[shareBookmarkId]) as vid " +
                "MATCH (v:Visible {id : vid}) WHERE v.deleteDate IS NULL and v:User WITH {id: shareBookmarkId, name: HEAD(sb[shareBookmarkId]), users: COLLECT(DISTINCT{id: v.id, email: v.email, lastname: v.lastName, firstname: v.firstName, username: v.id})} as sharedBookMark " +
                "RETURN sharedBookMark";

        Neo4j.getInstance().execute(queryNeo4j, params, Neo4jResult.validResultHandler(handler));
    }



    @Override
    public void getIdsFromBookMarks(final JsonArray bookmarksIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject().put(PARAM_BOOKMARKS_IDS, bookmarksIds);

        String queryNeo4j = "WITH $bookmarksIds AS shareBookmarkIds " +
                "UNWIND shareBookmarkIds AS shareBookmarkId " +
                "MATCH (u:User)-[:HAS_SB]->(sb:ShareBookmark) " +
                "UNWIND TAIL(sb[shareBookmarkId]) as vid MATCH (v:Visible {id : vid}) " +
                "WITH {ids: COLLECT(DISTINCT{id: v.id, name: v.name})} as sharedBookMark " +
                "RETURN COLLECT(sharedBookMark) as ids;";

        Neo4j.getInstance().execute(queryNeo4j, params, Neo4jResult.validResultHandler(handler));
    }

    @Override
    public void getUsersInfosFromIds(JsonArray userIds, JsonArray groupIds, Handler<Either<String, JsonArray>> handler) {
        JsonObject params = new JsonObject()
                .put(PARAM_USER_IDS, userIds)
                .put(PARAM_GROUP_IDS, groupIds);

        String queryUsersNeo4j = "MATCH(ug:User) WHERE ug.id IN $userIds WITH ug, " +
                "collect({id: ug.id, username: ug.displayName}) AS users return users ";
        String queryGroupsNeo4j = "MATCH(g:Group)-[:IN]-(ug:User) WHERE g.id IN $groupIds WITH g, " +
                "collect({id: ug.id, username: ug.displayName}) AS users return users ";
        String finalQuery = queryUsersNeo4j + "UNION " + queryGroupsNeo4j + ";";

        Neo4j.getInstance().execute(finalQuery, params, Neo4jResult.validResultHandler(handler));
    }
}
