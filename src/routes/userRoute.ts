import { Router } from "express"
import userController from "../controllers/userController"

const route = Router()

route.post('/user', userController.createUser)

route.get('/user/login', userController.userLogin)

route.get('/user/login/token', userController.userLoginWithToken)

route.get('/user/password/generate-token', userController.sendEmailToUpdatePassword)

route.put('/user/password/update', userController.updatePassword)

route.get('/user/pages/update-password/:token', userController.sendPageToUpdatePassword)

route.get('/user/validation/:token', userController.validateUserAccount)

route.get('/user/:id', userController.getUser)

export default route