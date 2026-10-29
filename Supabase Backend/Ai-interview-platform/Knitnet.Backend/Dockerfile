# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and projects for restore
COPY Knitnet.Backend.sln ./
COPY Knitnet.Shared/Knitnet.Shared.csproj Knitnet.Shared/
COPY Knitnet.UserApi/Knitnet.UserApi.csproj Knitnet.UserApi/
COPY Knitnet.CompanyApi/Knitnet.CompanyApi.csproj Knitnet.CompanyApi/
COPY Knitnet.TransactionApi/Knitnet.TransactionApi.csproj Knitnet.TransactionApi/

RUN dotnet restore

# Copy all source files
COPY . .

# Build the solution
RUN dotnet build -c Release -o /app/build

# Publish stage (build-arg selects target project)
FROM build AS publish
ARG API_PROJECT=Knitnet.UserApi
RUN dotnet publish ${API_PROJECT}/${API_PROJECT}.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

ARG API_PROJECT=Knitnet.UserApi
ENV DLL_NAME=${API_PROJECT}

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "dotnet ${DLL_NAME}.dll"]
